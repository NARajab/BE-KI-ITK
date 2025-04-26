const router = require("express").Router();

const Terms = require("../controllers/termsConditionController");
const authenticat = require("../middlewares/authenticat");

router.post("/", Terms.createTerms);

router.patch("/:id", Terms.updateTerms);

router.get("/", Terms.getAllTerms);

router.get("/:id", Terms.getTermsById);

module.exports = router;
