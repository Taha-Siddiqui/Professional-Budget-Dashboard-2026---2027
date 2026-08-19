const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => {
  console.log(`\nRegional Offices Budget Dashboard running at http://localhost:${PORT}`);
  console.log(`Demo login -> username: admin / viewer   password: password123\n`);
});
