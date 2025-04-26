const router = require("express").Router();

const Faq = require("../controllers/faqController");

router.post("/", Faq.createTypeFaq);

router.post("/by-type/:type", Faq.createFaqByType);

router.get("/", Faq.getAllFaq);

router.get("/by-type/:type", Faq.getFaqByType);

router.patch("/type", Faq.updateFaqType);

router.patch("/:id", Faq.updateFaq);

router.delete("/:id", Faq.deleteFaq);

module.exports = router;
