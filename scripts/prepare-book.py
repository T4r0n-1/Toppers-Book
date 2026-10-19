"""Prepare private R2 pages and a small, explicit public sample from an owner PDF.

Usage: python scripts/prepare-book.py INPUT.pdf OUTPUT_DIRECTORY
Never point OUTPUT_DIRECTORY at assets/ or dist/.
"""
import concurrent.futures
import hashlib
import json
import sys
import zipfile
from pathlib import Path

import fitz
from PIL import Image

BOOK_ID = 'cbse10-maths-standard'
CHAPTERS = [
    ('Cover', 1), ('Acknowledgement & copyright', 2), ('Preface & author', 3),
    ('Contents', 5), ('Exam preparation & strategy', 6),
    ('01 · Real Numbers', 14), ('02 · Polynomials', 22),
    ('03 · Pair of Linear Equations in Two Variables', 33),
    ('04 · Quadratic Equations', 45), ('05 · Arithmetic Progressions', 57),
    ('06 · Triangles', 69), ('07 · Coordinate Geometry', 85),
    ('08 · Introduction to Trigonometry', 100),
    ('09 · Some Applications of Trigonometry', 114), ('10 · Circles', 133),
    ('11 · Areas Related to Circles', 149), ('12 · Surface Areas and Volumes', 164),
    ('13 · Statistics', 180), ('14 · Probability', 199),
    ('Quick formula revision', 210), ('Sample paper', 214),
    ('Sample paper solutions', 217), ('Official paper practice guide', 221),
    ('My error log', 222), ('Back cover', 223)
]
SAMPLE_PAGES = [5, 14, 15, 69, 180]
_document = None


def initialise(pdf):
    global _document
    _document = fitz.open(pdf)


def render(task):
    number, directory = task
    path = Path(directory) / f'{number:04}.png'
    _document[number - 1].get_pixmap(dpi=160, alpha=False).save(path)
    data = path.read_bytes()
    if len(data) > 4 * 1024 * 1024:
        raise ValueError(f'Page {number} exceeds the reader size limit')
    return {'page': number, 'key': f'{BOOK_ID}/pages/{number:04}.png',
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def main():
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    if any(part in {'assets', 'dist'} for part in output.parts):
        raise ValueError('Private output cannot go inside public assets or dist')
    document = fitz.open(source)
    if document.page_count != 223:
        raise ValueError('This edition manifest expects 223 pages; recheck chapter starts for a different PDF')
    pages = output / BOOK_ID / 'pages'
    pages.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ProcessPoolExecutor(max_workers=4, initializer=initialise, initargs=(str(source),)) as pool:
        records = []
        for record in pool.map(render, [(n, str(pages)) for n in range(1, len(document) + 1)]):
            records.append(record)
            if record['page'] % 25 == 0:
                print(f'Rendered {record["page"]}/{len(document)} pages', flush=True)
    manifest = {'bookId': BOOK_ID, 'pageCount': len(document),
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'chapters': [{'title': title, 'page': page} for title, page in CHAPTERS],
                'objects': records}
    (output / 'upload-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    chapters = json.dumps(manifest['chapters'], ensure_ascii=False).replace("'", "''")
    sql = f"""-- Run once in toppers-store D1 console AFTER uploading all 223 private PNG pages.
-- This registers the supplied edition and leaves paid access disabled for testing.
UPDATE books SET title = 'CBSE Class 10 Mathematics Standard (041)',
  page_count = 223, chapters_json = '{chapters}', is_ready = 0
WHERE id = 'cbse10-maths-standard';
SELECT id, title, page_count, is_ready FROM books WHERE id = 'cbse10-maths-standard';
"""
    (output / '02-register-book.sql').write_text(sql, encoding='utf-8')
    (output / '01-READ-ME.txt').write_text('''TOPPERS BOOKS - PRIVATE R2 UPLOAD

1. Extract this ZIP on your computer.
2. Open Cloudflare R2 > toppers-books-private > Objects.
3. Upload the cbse10-maths-standard FOLDER, preserving its pages subfolder.
   The required first key is cbse10-maths-standard/pages/0001.png.
   The required last key is cbse10-maths-standard/pages/0223.png.
4. Check that all 223 PNG files completed. Keep public access disabled.
5. After confirming the upload, run 02-register-book.sql in the toppers-store
   D1 console. Do not run the original schema again to register the book.
6. The original PDF and DOCX must NOT be uploaded to GitHub or public assets.
   Only the selected samples and cover are public. The ZIP is an upload package,
   not a book format to upload as one R2 object. Extract it first.

Paid sales remain closed. Reading access and watermark tests must be completed
before changing is_ready or SALES_OPEN. No payment credentials are in this file.

For later corrections, replace only the affected numbered PNG object. If pages
are inserted/deleted/reordered, regenerate and update the chapter manifest too.
The upload manifest includes source and page hashes for verification and backup.
''', encoding='utf-8')
    public = Path(__file__).resolve().parent.parent / 'assets'
    # These are the ONLY book images allowed into the public website build.
    sample_directory = public / 'book-samples'
    sample_directory.mkdir(parents=True, exist_ok=True)
    cover = document[0].get_pixmap(dpi=120, alpha=False)
    Image.frombytes('RGB', [cover.width, cover.height], cover.samples).save(public / 'maths-cover.webp', 'WEBP', quality=90, method=6)
    for number in SAMPLE_PAGES:
        image = document[number - 1].get_pixmap(dpi=160, alpha=False)
        Image.frombytes('RGB', [image.width, image.height], image.samples).save(sample_directory / f'page-{number:04}.webp', 'WEBP', quality=92, method=6)
    archive = output.parent / 'Toppers_Books_R2_Upload.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED) as bundle:
        for path in sorted(output.rglob('*')):
            if path.is_file(): bundle.write(path, path.relative_to(output))
    print(json.dumps({'pages': len(records), 'totalBytes': sum(r['bytes'] for r in records),
                      'largestPageBytes': max(r['bytes'] for r in records),
                      'archive': str(archive), 'archiveBytes': archive.stat().st_size}), flush=True)


if __name__ == '__main__':
    main()
