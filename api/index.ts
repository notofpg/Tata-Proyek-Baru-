// @ts-ignore
import serverApp from './_server.cjs';

// Safely resolve the Express app instance across CommonJS and ES module bundlers
const app = (serverApp && (serverApp.default || serverApp));

export default app;
