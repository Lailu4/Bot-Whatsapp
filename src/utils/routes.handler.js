const { Router } = require("express");
const fs = require("node:fs");
const router = Router();

const path = fs.readdirSync("./src/routes").filter(file => file.endsWith(".routes.js"));
for (const file of path) {
    const routes = require(`../routes/${file}`);
    router.use(routes, (req, res, next) => {
        next();
    })
}

module.exports = router;