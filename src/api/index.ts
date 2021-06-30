import { Router } from 'express';
import reward from './routes/reward';
import actors from './routes/actors';
import user from './routes/user';
import validator from './routes/validator';
import council from './routes/council';

// guaranteed to get dependencies
export default (): Router => {
  const app = Router();

  /**
   * Register any routing-middleware here by giving it access to the express-app
   */
  reward(app);
  actors(app);
  user(app);
  validator(app);
  council(app);

  return app;
};