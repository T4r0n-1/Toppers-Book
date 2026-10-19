// Original concept checks for this practice area; these are not labelled as PYQs.
const chapterNames = ['Real Numbers','Polynomials','Pair of Linear Equations','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Introduction to Trigonometry','Applications of Trigonometry','Circles','Areas Related to Circles','Surface Areas and Volumes','Statistics','Probability'];
export const practiceChapters = chapterNames.map((title, i) => ({ id: i + 1, title }));
const rows = [
 [1,'What is the HCF of 96 and 404?',['4','8','12','16'],0,'404 = 4 × 96 + 20; 96 = 4 × 20 + 16; 20 = 16 + 4. The last non-zero remainder is 4.'],
 [1,'What is the decimal form of 13/125?',['0.104','0.013','0.125','1.04'],0,'Multiply numerator and denominator by 8: 13/125 = 104/1000 = 0.104.'],
 [2,'For 2x² − 7x + 3, what is the sum of its zeroes?',['−7/2','7/2','3/2','−3/2'],1,'For ax² + bx + c, the sum of zeroes is −b/a. Here −(−7)/2 = 7/2.'],
 [2,'Which polynomial has zeroes −2 and 3?',['x² + x − 6','x² − x + 6','x² − x − 6','x² + 5x + 6'],2,'The polynomial is (x + 2)(x − 3) = x² − x − 6.'],
 [3,'If 2x + 3y = 12 and x − y = 1, find x.',['2','3','4','5'],1,'x = y + 1. Substitution gives 2y + 2 + 3y = 12, so y = 2 and x = 3.'],
 [3,'How many solutions do x + y = 2 and 2x + 2y = 5 have?',['Exactly one','Exactly two','Infinitely many','No solution'],3,'The second equation gives x + y = 5/2. The same sum cannot be both 2 and 5/2; the lines are parallel.'],
 [4,'What is the discriminant of x² − 4x + 4 = 0?',['0','4','8','16'],0,'D = b² − 4ac = (−4)² − 4 × 1 × 4 = 0. The roots are equal.'],
 [4,'What is the larger root of x² − 7x + 12 = 0?',['2','3','4','6'],2,'x² − 7x + 12 = (x − 3)(x − 4), so the roots are 3 and 4.'],
 [5,'An AP has first term 5 and common difference 3. Find its 10th term.',['27','30','32','35'],2,'aₙ = a + (n − 1)d = 5 + 9 × 3 = 32.'],
 [5,'Find the sum of the first 20 positive odd numbers.',['200','210','380','400'],3,'The sum of the first n positive odd numbers is n². For n = 20, the sum is 400.'],
 [6,'Two similar triangles have corresponding sides in the ratio 2:3. What is their area ratio?',['2:3','4:9','8:27','3:2'],1,'The ratio of areas of similar triangles is the square of the corresponding side ratio: 2²:3² = 4:9.'],
 [6,'A right triangle has perpendicular sides 6 cm and 8 cm. Find its hypotenuse.',['9 cm','10 cm','12 cm','14 cm'],1,'By Pythagoras, c² = 6² + 8² = 100, hence c = 10 cm.'],
 [7,'Find the distance between (1, 2) and (4, 6).',['3 units','4 units','5 units','7 units'],2,'Distance = √[(4 − 1)² + (6 − 2)²] = √(9 + 16) = 5 units.'],
 [7,'Find the midpoint of the segment joining (−2, 5) and (4, −1).',['(1, 2)','(2, 1)','(−1, 3)','(3, −2)'],0,'Midpoint = ((−2 + 4)/2, (5 − 1)/2) = (1, 2).'],
 [8,'Evaluate sin 30° + cos 60°.',['0','1/2','1','2'],2,'sin 30° = 1/2 and cos 60° = 1/2, so the sum is 1.'],
 [8,'For an acute angle θ, tan θ = 3/4. Find sin θ.',['3/4','4/5','5/3','3/5'],3,'Take opposite = 3 and adjacent = 4. The hypotenuse is 5, hence sin θ = 3/5.'],
 [9,'A tower is viewed from level ground 10√3 m from its base. The angle of elevation is 30°. Find its height.',['10 m','10√3 m','20 m','30 m'],0,'tan 30° = height/(10√3). Thus height = 10√3 × (1/√3) = 10 m.'],
 [9,'From a point on level ground 20 m from the base of a 20 m tower, what is the angle of elevation to its top?',['30°','45°','60°','90°'],1,'tan θ = height/distance = 20/20 = 1. For an acute angle, θ = 45°.'],
 [10,'What is the angle between a tangent and the radius at the point of contact?',['0°','45°','60°','90°'],3,'A tangent is perpendicular to the radius drawn to the point of contact, so the angle is 90°.'],
 [10,'Two tangents from the same external point have lengths (x + 2) cm and (2x − 3) cm. Find x.',['3','4','5','7'],2,'Tangents from the same external point have equal lengths: x + 2 = 2x − 3, giving x = 5.'],
 [11,'Find the area of a circle of radius 7 cm. Use π = 22/7.',['44 cm²','154 cm²','308 cm²','49 cm²'],1,'Area = πr² = (22/7) × 7 × 7 = 154 cm².'],
 [11,'A sector has radius 6 cm and central angle 60°. Find its area.',['6π cm²','12π cm²','18π cm²','36π cm²'],0,'Sector area = (60/360) × π × 6² = 6π cm².'],
 [12,'Find the volume of a cylinder with radius 3 cm and height 7 cm.',['21π cm³','42π cm³','63π cm³','126π cm³'],2,'Volume = πr²h = π × 3² × 7 = 63π cm³.'],
 [12,'Find the volume of a sphere of radius 3 cm.',['12π cm³','27π cm³','108π cm³','36π cm³'],3,'Volume = (4/3)πr³ = (4/3) × π × 27 = 36π cm³.'],
 [13,'Find the arithmetic mean of 2, 4, 6 and 8.',['4','5','6','8'],1,'Mean = (2 + 4 + 6 + 8)/4 = 20/4 = 5.'],
 [13,'Find the median of 3, 5, 7, 9 and 11.',['5','6','7','9'],2,'The data are already in ascending order. The middle (third) observation is 7.'],
 [14,'A fair die is rolled once. What is the probability of getting a prime number?',['1/6','1/3','1/2','2/3'],2,'The prime outcomes are 2, 3 and 5: three favourable outcomes out of six. Probability = 3/6 = 1/2.'],
 [14,'A bag has 3 red and 2 blue balls. One ball is chosen at random. Find the probability that it is blue.',['2/5','3/5','1/2','1/5'],0,'There are 2 blue balls among 5 balls in total. Probability of blue = 2/5.']
];
export const practiceQuestions = rows.map(([chapter, prompt, options, correct, explanation], i) => ({ id: `maths-${String(i + 1).padStart(2,'0')}`, chapter, prompt, options, correct, explanation }));
