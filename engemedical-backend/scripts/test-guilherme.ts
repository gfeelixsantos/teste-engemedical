import { fuzzyMatchesByNameTokens, buildNameSearchVariants, buildMedicalNameSearchVariants, buildCedillNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

const candidate = 'GUILHERME AUGUSTO DOS ANJOS OLIVEIRA';
const query = 'GUILHERME AUGUSTO DOS ANJOS DE OLIVEIRA';

console.log('Fuzzy Match (candidate vs query):', fuzzyMatchesByNameTokens(candidate, query));
console.log('Fuzzy Match (query vs candidate):', fuzzyMatchesByNameTokens(query, candidate));
console.log('Search Variants:', buildNameSearchVariants(query));
