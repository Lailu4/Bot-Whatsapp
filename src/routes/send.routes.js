const { Router } = require("express");
const router = Router();

router.post("/send", (req, res) => {
    const { message, to } = req.body
    const new_number = `${to}@c.us`

    sendMessage(new_number, message)
    res.send({ status: "Enviado" })
})

module.exports = router;