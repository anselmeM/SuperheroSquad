/**
 * Cache Debugging CLI Tool
 * 
 * This script provides a command-line interface for testing and debugging
 * the application's cache system. It allows developers to:
 * 
 * - View cache statistics
 * - Create test entries with custom TTL
 * - Trigger cleanup operations with different sampling parameters
 * - Simulate high cache load for performance testing
 * 
 * Usage: tsx cache-debug.ts [command] [options]
 * 
 * Commands:
 *  stats                 Show current cache statistics
 *  create [count] [ttl]  Create test entries (default: count=10, ttl=30000ms)
 *  cleanup [sample]      Run cache cleanup (default: sample=0.2)
 *  stress [count]        Create many entries to test performance (default: count=100)
 *  help                  Show this help message
 */

const API_URL = 'http://localhost:5000';

// Utility function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Format numbers with commas for readability
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Display help message
function showHelp() {
  console.log('\nCache Debugging CLI Tool');
  console.log('=======================\n');
  console.log('Usage: tsx cache-debug.ts [command] [options]\n');
  console.log('Commands:');
  console.log('  stats                 Show current cache statistics');
  console.log('  create [count] [ttl]  Create test entries (default: count=10, ttl=30000ms)');
  console.log('  cleanup [sample]      Run cache cleanup (default: sample=0.2)');
  console.log('  stress [count]        Create many entries to test performance (default: count=100)');
  console.log('  help                  Show this help message\n');
  console.log('Examples:');
  console.log('  tsx cache-debug.ts stats');
  console.log('  tsx cache-debug.ts create 5 10000');
  console.log('  tsx cache-debug.ts cleanup 0.5');
  console.log('  tsx cache-debug.ts stress 200\n');
}

// Get cache statistics
async function getStats() {
  try {
    const response = await fetch(`${API_URL}/api/cache-stats`);
    const data = await response.json();
    
    console.log('\nCache Statistics');
    console.log('===============\n');
    console.log('Hero Cache:');
    console.log(`  Size: ${formatNumber(data.hero.size)} items`);
    console.log(`  Hits: ${formatNumber(data.hero.hits)}`);
    console.log(`  Misses: ${formatNumber(data.hero.misses)}`);
    console.log(`  Hit Rate: ${(data.hero.hitRate * 100).toFixed(2)}%`);
    
    console.log('\nSearch Cache:');
    console.log(`  Size: ${formatNumber(data.search.size)} items`);
    console.log(`  Hits: ${formatNumber(data.search.hits)}`);
    console.log(`  Misses: ${formatNumber(data.search.misses)}`);
    console.log(`  Hit Rate: ${(data.search.hitRate * 100).toFixed(2)}%`);
    
    console.log(`\nTimestamp: ${new Date(data.timestamp).toLocaleString()}`);
    
    return data;
  } catch (error) {
    console.error('Error fetching cache statistics:', error);
    process.exit(1);
  }
}

// Create test entries
async function createTestEntries(count = 10, ttl = 30000) {
  console.log(`\nCreating ${count} test entries with TTL of ${ttl}ms...`);
  
  for (let i = 1; i <= count; i++) {
    try {
      const query = `TestHero${i}_${Date.now()}`;
      const response = await fetch(
        `${API_URL}/api/search?query=${encodeURIComponent(query)}&expire=true&ttl=${ttl}`
      );
      
      if (response.ok) {
        process.stdout.write('.');
      } else {
        process.stdout.write('x');
      }
      
      // Add some delay to avoid overwhelming the server
      if (i % 5 === 0) {
        process.stdout.write(' '); // Space every 5 entries for readability
      }
      
      // Small delay between requests
      await sleep(200);
    } catch (error) {
      process.stdout.write('!');
    }
  }
  
  console.log('\n\nFinished creating test entries.\n');
  
  // Show updated stats
  await getStats();
}

// Run cache cleanup
async function runCleanup(sampleSize = 0.2) {
  console.log(`\nRunning cache cleanup with ${sampleSize * 100}% sampling...`);
  
  try {
    const before = await getStats();
    
    const response = await fetch(`${API_URL}/api/cleanup?sampleSize=${sampleSize}`);
    const data = await response.json();
    
    console.log('\nCleanup Results');
    console.log('==============\n');
    console.log(`Hero cache items removed: ${formatNumber(data.cleaned.hero)}`);
    console.log(`Search cache items removed: ${formatNumber(data.cleaned.search)}`);
    console.log(`Total items removed: ${formatNumber(data.cleaned.total)}`);
    console.log(`\nSampling parameters:`);
    console.log(`  Sample size: ${data.params.sampleSize * 100}%`);
    console.log(`  Min sample: ${data.params.minSample} items`);
    console.log(`  Max sample: ${data.params.maxSample} items`);
    
    // Show current stats after cleanup
    console.log('\nUpdated statistics after cleanup:');
    await getStats();
    
    // Calculate reduction
    const heroReduction = ((before.hero.size - data.stats.hero.size) / before.hero.size * 100) || 0;
    const searchReduction = ((before.search.size - data.stats.search.size) / before.search.size * 100) || 0;
    
    console.log(`\nCache size reduction:`);
    console.log(`  Hero cache: ${heroReduction.toFixed(2)}%`);
    console.log(`  Search cache: ${searchReduction.toFixed(2)}%`);
  } catch (error) {
    console.error('Error running cleanup:', error);
    process.exit(1);
  }
}

// Create many entries to stress test the cache
async function stressTest(count = 100) {
  console.log(`\nRunning stress test with ${count} entries...`);
  console.log('This may take a while, please be patient.\n');
  
  const startTime = Date.now();
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * batchSize;
    const batchEnd = Math.min((batch + 1) * batchSize, count);
    
    console.log(`Processing batch ${batch + 1}/${batches} (entries ${batchStart + 1}-${batchEnd})...`);
    
    const promises: Promise<void>[] = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const query = `StressTest_${Date.now()}_${i}`;
      promises.push(
        fetch(`${API_URL}/api/search?query=${encodeURIComponent(query)}&expire=true&ttl=60000`)
          .then(() => { process.stdout.write('.'); })
          .catch(() => { process.stdout.write('!'); })
      );
    }
    
    await Promise.all(promises);
    console.log(' Done!');
    
    // Add delay between batches to avoid overwhelming the server
    if (batch < batches - 1) {
      await sleep(1000);
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nStress test completed in ${duration.toFixed(2)} seconds.`);
  
  // Show updated stats
  await getStats();
  
  console.log(`\nAverage time per entry: ${(duration / count * 1000).toFixed(2)}ms`);
}

// Main function to parse command line arguments and execute commands
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'stats':
      await getStats();
      break;
    
    case 'create':
      const count = parseInt(args[1]) || 10;
      const ttl = parseInt(args[2]) || 30000;
      await createTestEntries(count, ttl);
      break;
    
    case 'cleanup':
      const sampleSize = parseFloat(args[1]) || 0.2;
      await runCleanup(sampleSize);
      break;
    
    case 'stress':
      const stressCount = parseInt(args[1]) || 100;
      await stressTest(stressCount);
      break;
    
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Execute the main function
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});