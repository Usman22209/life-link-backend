const http = require('http');

http.get('http://localhost:3001/api-docs-json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const swagger = JSON.parse(data);
      const paths = Object.keys(swagger.paths);
      paths.forEach(path => {
        const methods = Object.keys(swagger.paths[path]);
        methods.forEach(method => {
          console.log(`${method.toUpperCase()} ${path}`);
        });
      });
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching swagger:', err.message);
});
