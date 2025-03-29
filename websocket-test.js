import WebSocket from 'ws';

// Create a WebSocket connection
const ws = new WebSocket('ws://localhost:5000/ws');

// Connection opened
ws.on('open', function() {
  console.log('WebSocket connection established');
  
  // Send a ping message
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
  
  console.log('Ping sent');
});

// Listen for messages
ws.on('message', function(data) {
  console.log('Message received:', data.toString());
  
  // Parse the message
  try {
    const message = JSON.parse(data);
    console.log('Parsed message type:', message.type);
    
    if (message.type === 'pong') {
      console.log('Pong received with timestamp:', message.timestamp);
      console.log('Round-trip time:', Date.now() - message.received, 'ms');
    } else if (message.type === 'cache-stats') {
      console.log('Cache stats received:');
      console.log('- Hero cache:', message.hero);
      console.log('- Search cache:', message.search);
    }
  } catch (e) {
    console.error('Failed to parse message:', e);
  }
});

// Handle connection errors
ws.on('error', function(error) {
  console.error('WebSocket error:', error);
});

// Handle connection closure
ws.on('close', function(code, reason) {
  console.log(`WebSocket closed with code ${code} and reason: ${reason || 'No reason provided'}`);
});

// Close the connection after 10 seconds
setTimeout(() => {
  console.log('Closing WebSocket after 10 seconds');
  ws.close(1000, 'Test completed');
}, 10000);