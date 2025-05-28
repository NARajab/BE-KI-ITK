const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");

const badWordsFilePath = path.join(__dirname, "./badWords.txt");

const loadBadWords = () => {
  try {
    const data = fs.readFileSync(badWordsFilePath, "utf8");
    return data.split("\n").map((word) => word.trim());
  } catch (err) {
    console.error("Error membaca file badWords.txt:", err.message);
    return [];
  }
};

const badWords = loadBadWords();

const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
  distance: 50,
  keys: ["word"],
};

const fuse = new Fuse(
  badWords.map((word) => ({ word })),
  fuseOptions
);

const replacements = {
  1: "i",
  3: "e",
  4: "a",
  5: "s",
  7: "t",
  0: "o",
};

const shouldReplace = (text) => /[013457]/.test(text) && /\d/.test(text);

const replaceNumbersWithLetters = (text) => {
  if (!shouldReplace(text)) return text;
  return text
    .split("")
    .map((char) => replacements[char] || char)
    .join("");
};

const cleanWord = (word) => {
  const textWithLetters = replaceNumbersWithLetters(word);
  return textWithLetters.replace(/[^a-zA-Z]/g, "");
};

const containsProfanity = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleaned = cleanWord(word);
    if (cleaned.length < 3) continue;

    const results = fuse.search(cleaned);
    const match = results.find((r) => r.score < 0.1);
    if (match) {
      console.log(
        `🚫 Kata terdeteksi: "${word}" → Dibersihkan: "${cleaned}" → Cocok dengan: "${match.item.word}"`
      );
      return true;
    }
  }
  return false;
};

const censorText = (text) => {
  let result = text;
  badWords.forEach((word) => {
    const regex = new RegExp(word, "gi");
    const stars = "*".repeat(word.length);
    result = result.replace(regex, stars);
  });
  return result;
};

module.exports = { containsProfanity, censorText };
