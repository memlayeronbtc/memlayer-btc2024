import dotenv from 'dotenv';
import { makeApp, initMempoolData } from './app';

dotenv.config({ path: './.env' });
initMempoolData();
const app: any = makeApp(process.env.SIGNER_PRIVATE_KEY as string, '/');
console.log('listening at PORT:', process.env.PORT);
console.log('ready!')
app.listen(process.env.PORT);
