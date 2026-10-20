// Add one entry only when a NEW paper is published. Editing a paper keeps its id.
// publishedAt is a Unix timestamp in seconds; never list future/unpublished papers.
// Example: { id: 'maths-paper-01', title: 'Maths Practice Paper 1', path: '/practice.html', publishedAt: 1792512000 }
// Existing question-bank content is intentionally not announced retrospectively.
export const practicePapers = [];
