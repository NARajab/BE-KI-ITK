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
  threshold: 0.3, // Menyesuaikan threshold agar lebih fleksibel
  keys: ["word"],
};

const fuse = new Fuse(
  badWords.map((word) => ({ word })),
  fuseOptions
);

const replaceNumbersWithLetters = (text) => {
  const replacements = {
    3: "e",
    4: "a",
    1: "i",
    0: "o",
    5: "s",
    7: "t",
  };

  return text
    .split("")
    .map((char) => replacements[char] || char)
    .join("");
};

const cleanWord = (word) => {
  const textWithLetters = replaceNumbersWithLetters(word);
  return textWithLetters.replace(/[^a-zA-Z]/g, "").toLowerCase();
};

const containsProfanity = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleaned = cleanWord(word);

    // Menambahkan pengecekan panjang kata minimal
    if (cleaned.length < 3) continue; // Abaikan kata dengan panjang kurang dari 3

    const results = fuse.search(cleaned);
    const match = results.find((r) => r.score < 0.5); // Tetap mempertahankan threshold 0.3

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
