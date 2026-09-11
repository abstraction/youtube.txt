import nlp from 'compromise';
const doc = nlp('This is a test. Is it working? Yes it is.');
console.log(doc.sentences().out('array'));
