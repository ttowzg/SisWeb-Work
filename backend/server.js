require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors"); // Import cors
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = 3000;

// Access your API key as an environment variable (see ".env" file)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Import the database connection
const { db } = require("./firebase-config");

app.use(express.json());
app.use(cors()); // Use cors middleware

const authMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying ID token:", error);
    res.status(401).send("Unauthorized");
  }
};

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// Route to get all patients
app.get("/patients", authMiddleware, async (req, res) => {
  try {
    const patientsSnapshot = await db
      .collection("patients")
      .where("createdBy", "==", req.user.uid)
      .get();
    const patients = [];
    patientsSnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(patients);
  } catch (error) {
    console.error("Error getting patients: ", error);
    res.status(500).send("Something went wrong");
  }
});

// Route to get a single patient by ID
app.get("/patients/:id", authMiddleware, async (req, res) => {
  try {
    const patientId = req.params.id;
    const patientDoc = await db.collection("patients").doc(patientId).get();

    if (!patientDoc.exists) {
      return res.status(404).send("Patient not found");
    }

    // Check if the user is authorized to view this patient
    if (patientDoc.data().createdBy !== req.user.uid) {
      return res.status(403).send("Forbidden");
    }

    res.status(200).json({ id: patientDoc.id, ...patientDoc.data() });
  } catch (error) {
    console.error("Error getting patient: ", error);
    res.status(500).send("Something went wrong");
  }
});

// Route to get all reports for a specific patient
app.get("/patients/:id/reports", authMiddleware, async (req, res) => {
  try {
    const patientId = req.params.id;
    const reportsSnapshot = await db
      .collection("patients")
      .doc(patientId)
      .collection("reports")
      .orderBy("createdAt", "desc")
      .get();
    const reports = [];
    reportsSnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error("Error getting patient reports: ", error);
    res.status(500).send("Something went wrong");
  }
});

// Route to add a new patient
app.post("/patients", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      dob,
      gender,
      cpf,
      phone,
      mainComplaint,
      hda,
      chronicDiseases,
      allergies,
      medications,
    } = req.body;

    const patientRef = await db.collection("patients").add({
      name,
      dob,
      gender,
      cpf,
      phone,
      mainComplaint,
      hda,
      chronicDiseases,
      allergies,
      medications,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    });
    res.status(201).send(`Patient added with ID: ${patientRef.id}`);
  } catch (error) {
    console.error("Error adding patient: ", error);
    res.status(500).send("Something went wrong");
  }
});

// New endpoint for generating reports
app.post("/generate-report", authMiddleware, async (req, res) => {
  try {
    const { patientData } = req.body;
    console.log("Received patient data for report generation:", patientData);

    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable.");
      return res.status(500).json({ message: "Missing API key" });
    }

    console.log("GEMINI_API_KEY is present. Constructing prompt...");
    // Construct the prompt for Gemini API
    const prompt = `Gere um relatório médico detalhado para o seguinte paciente:

Nome: ${patientData.name}
Data de Nascimento: ${patientData.dob}
Gênero: ${patientData.gender}
CPF: ${patientData.cpf}
Telefone: ${patientData.phone}
Queixa Principal: ${patientData.mainComplaint}
História da Doença Atual: ${patientData.hda}
Doenças Crônicas: ${patientData.chronicDiseases}
Alergias: ${patientData.allergies}
Medicamentos em Uso: ${patientData.medications}

O relatório deve ser profissional, claro e conciso, focado nos pontos mais relevantes para um médico, redija somente o relatório, sem esse cabeçalho que você diz que fará e não precisa dos detalhes médicos embaixo.`;

    console.log("Prompt constructed. Getting Generative Model...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    console.log("Generative Model obtained. Generating content...");

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      throw geminiError; // Re-throw the original error for more details in the outer catch
    }

    console.log("Content generated. Processing response...");
    const response = await result.response;
    const generatedReport = response.text();

    console.log("Report generated. Saving to Firebase...");
    // Save the generated report to Firebase as a subcollection
    const patientDocRef = db.collection("patients").doc(patientData.id);
    const reportRef = await patientDocRef.collection("reports").add({
      reportContent: generatedReport,
      createdAt: new Date().toISOString(),
      generatedBy: req.user.uid,
    });

    console.log("Report saved to Firebase. Sending response...");
    res.status(200).json({ report: generatedReport, reportId: reportRef.id });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      message: "Error generating report",
      error: error.message,
      details: error,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
