const FEMALE_NAMES = [
  'emma', 'olivia', 'ava', 'sophia', 'isabella', 'mia', 'charlotte', 'amelia',
  'harper', 'evelyn', 'abigail', 'emily', 'elizabeth', 'sofia', 'ella', 'madison',
  'scarlett', 'victoria', 'aria', 'grace', 'chloe', 'camila', 'penelope', 'riley',
  'layla', 'lillian', 'nora', 'zoey', 'mila', 'aubrey', 'hannah', 'lily', 'addison',
  'eleanor', 'natalie', 'luna', 'savannah', 'brooklyn', 'leah', 'zoe', 'stella',
  'hazel', 'ellie', 'paisley', 'audrey', 'skylar', 'violet', 'claire', 'bella',
  'aurora', 'lucy', 'anna', 'samantha', 'caroline', 'genesis', 'aaliyah', 'kennedy',
  'kinsley', 'allison', 'maya', 'sarah', 'madelyn', 'adeline', 'alexa', 'ariana',
  'elena', 'gabriella', 'naomi', 'alice', 'sadie', 'hailey', 'eva', 'emilia',
  'autumn', 'quinn', 'nevaeh', 'piper', 'ruby', 'serenity', 'willow', 'everly',
  'cora', 'kaylee', 'lydia', 'aubree', 'arianna', 'eliana', 'peyton', 'melanie',
  'gianna', 'isabelle', 'julia', 'valentina', 'nova', 'clara', 'vivian', 'reagan',
  'mackenzie', 'madeline', 'brielle', 'delilah', 'isla', 'rylee', 'katherine',
  'sophie', 'josephine', 'ivy', 'liliana', 'jade', 'maria', 'taylor', 'hadley',
  'kylie', 'emery', 'adalynn', 'natalia', 'annabelle', 'faith', 'alexandra', 'ximena',
  'ashley', 'brianna', 'raelynn', 'bailey', 'mary', 'athena', 'andrea', 'leilani',
  'jasmine', 'lyla', 'margaret', 'alyssa', 'arya', 'norah', 'khloe', 'kayla',
  'eden', 'eliza', 'rose', 'ariel', 'melody', 'alexis', 'isabel', 'sydney',
  'juliana', 'lauren', 'iris', 'emerson', 'london', 'morgan', 'lilly', 'charlie',
  'aliyah', 'valeria', 'arabella', 'sara', 'finley', 'trinity', 'ryleigh', 'jordyn',
  'jocelyn', 'kimberly', 'esther', 'molly', 'valerie', 'cecilia', 'anastasia', 'daisy',
  'reese', 'laila', 'mya', 'amy', 'teagan', 'annie', 'alayna', 'brooke', 'jezebel',
  'aurora', 'freya', 'sage', 'wren', 'dahlia', 'juniper', 'maeve', 'rosalie', 'thea'
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomDomain(): string {
  const name = getRandomElement(FEMALE_NAMES);
  const number = getRandomInt(100, 9999);
  const suffix = getRandomInt(0, 99);
  
  // Format: name + number + optional suffix for extra uniqueness
  const domainName = suffix > 50 
    ? `${name}${number}${suffix}` 
    : `${name}${number}`;
  
  return `${domainName}.vercel.app`;
}

export function generateMultipleDomainCandidates(count: number = 5): string[] {
  const candidates: string[] = [];
  const usedNames = new Set<string>();
  
  while (candidates.length < count) {
    const domain = generateRandomDomain();
    if (!usedNames.has(domain)) {
      usedNames.add(domain);
      candidates.push(domain);
    }
  }
  
  return candidates;
}
