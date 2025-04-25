const router = require("express").Router();

const Faq = require("../controllers/faqController");

router.post("/", Faq.createTypeFaq);

router.post("/by-type/:type", Faq.createFaqByType);

module.exports = router;
