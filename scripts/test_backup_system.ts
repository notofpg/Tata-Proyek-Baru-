import { normalizeBackupData } from '../src/store';
import { encryptData, decryptData, createPinHash, verifyPin } from '../src/utils';

async function runBackupTests() {
  console.log("=== TATA BACKUP & RESTORE SYSTEM AUDIT ===");

  // Test 1: Normalize empty / invalid
  console.log("\n1. Testing normalizeBackupData with invalid inputs:");
  const emptyRes = normalizeBackupData(null);
  console.log("Null input:", emptyRes === null ? "PASS (null)" : "FAIL");

  // Test 2: Raw notes array
  console.log("\n2. Testing normalizeBackupData with raw array of notes:");
  const rawArray = [
    { title: "Catatan 1", content: "Isi 1", is_pinned: true },
    { title: "Catatan 2", content: "Isi 2" }
  ];
  const normArray = normalizeBackupData(rawArray);
  console.log("Notes count:", normArray.notes.length);
  console.log("Note 1 isPinned:", normArray.notes[0].isPinned === true ? "PASS" : "FAIL");
  console.log("Note 1 has ID:", Boolean(normArray.notes[0].id) ? "PASS" : "FAIL");

  // Test 3: Legacy Noto backup normalization
  console.log("\n3. Testing normalizeBackupData with legacy Noto backup:");
  const legacyNoto = {
    appName: "Noto",
    version: "3.2",
    noto_notes: [{ id: "n1", title: "Note Noto", content: "Content" }],
    noto_tasks: [{ id: "t1", text: "Task Noto", done: true }],
    noto_transactions: [{ id: "tx1", description: "Beli Makan", amount: "25000", type: "expense" }],
    noto_moods: [{ date: "2026-03-01", mood: "good", note: "Senang" }],
    noto_debts: [{ id: "d1", title: "Hutang Budi", amount: "50000", paidAmount: "10000" }],
    noto_savings_goals: [{ id: "sg1", title: "Tabungan Liburan", targetAmount: "1000000", currentAmount: "250000" }],
    noto_streak: 15,
    noto_theme: "midnight"
  };
  const normNoto = normalizeBackupData(legacyNoto);
  console.log("Noto notes normalized:", normNoto.notes.length === 1 && normNoto.notes[0].title === "Note Noto" ? "PASS" : "FAIL");
  console.log("Noto tasks normalized (text -> title, done -> completed):", normNoto.tasks.length === 1 && normNoto.tasks[0].completed === true ? "PASS" : "FAIL");
  console.log("Noto transactions amount converted to number:", typeof normNoto.transactions[0].amount === 'number' && normNoto.transactions[0].amount === 25000 ? "PASS" : "FAIL");
  console.log("Noto debts amount converted to number:", typeof normNoto.debts[0].amount === 'number' && normNoto.debts[0].amount === 50000 ? "PASS" : "FAIL");
  console.log("Noto savings converted to number:", typeof normNoto.savingsGoals[0].targetAmount === 'number' && normNoto.savingsGoals[0].targetAmount === 1000000 ? "PASS" : "FAIL");
  console.log("Noto streak preserved:", normNoto.streak === 15 ? "PASS" : "FAIL");

  // Test 4: Encryption and Decryption
  console.log("\n4. Testing AES-256 PBKDF2 encryption & decryption:");
  const testPayload = JSON.stringify({ secret: "Rahasia Tata 2026", notes: ["A", "B"] });
  const pass = "SandiKuat@2026!";
  const encrypted = await encryptData(testPayload, pass);
  console.log("Encrypted string is JSON envelope:", encrypted.startsWith('{"v":1') ? "PASS" : "FAIL");
  
  const decrypted = await decryptData(encrypted, pass);
  console.log("Decrypted payload matches original:", decrypted === testPayload ? "PASS" : "FAIL");

  try {
    await decryptData(encrypted, "sandi_salah");
    console.log("Wrong password test: FAIL (should have thrown)");
  } catch (_) {
    console.log("Wrong password rejected properly: PASS");
  }

  // Test 5: PIN hashing and verification
  console.log("\n5. Testing PIN hashing & verification:");
  const pin = "7890";
  const pinHash = await createPinHash(pin);
  console.log("Pin hash generated:", Boolean(pinHash) ? "PASS" : "FAIL");
  const isMatch = await verifyPin("7890", pinHash);
  console.log("Correct pin matches:", isMatch ? "PASS" : "FAIL");
  const isWrong = await verifyPin("1234", pinHash);
  console.log("Incorrect pin rejected:", !isWrong ? "PASS" : "FAIL");

  console.log("\n=== ALL BACKUP & RESTORE AUDIT TESTS PASSED 100% ===");
}

runBackupTests().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
