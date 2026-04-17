import {} from '../subjectConfig.js';
export function isSocialSubject(subject) {
    if (!subject)
        return false;
    const s = subject.toString();
    return ((s || '').includes('social') ||
        (s || '').includes('geography') ||
        (s || '').includes('economics') ||
        (s || '').includes('politics') ||
        (s || '').includes('ethics') ||
        (s || '').includes('social_culture') ||
        (s || '').includes('living_ethics') ||
        (s || '').includes('ethics_thought'));
}
