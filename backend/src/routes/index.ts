import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { ticketRouter } from "./ticket.routes.js";
import { lookupRouter } from "./lookup.routes.js";
import { bankAccountRouter } from "./bankAccount.routes.js";
import { ledgerRouter } from "./ledger.routes.js";
import { currentAccountRouter } from "./currentAccount.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { userRouter } from "./user.routes.js";
import { activityRouter } from "./activity.routes.js";
import { activityPriceRouter } from "./activityPrice.routes.js";
import { ticketTemplateRouter } from "./ticketTemplate.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/tickets", ticketRouter);
apiRouter.use("/bank-accounts", bankAccountRouter);
apiRouter.use("/ledger", ledgerRouter);
apiRouter.use("/current-accounts", currentAccountRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/activities", activityRouter);
apiRouter.use("/activity-prices", activityPriceRouter);
apiRouter.use("/ticket-templates", ticketTemplateRouter);
apiRouter.use(lookupRouter);
