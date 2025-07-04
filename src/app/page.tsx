"use client";
import React, { useState, useEffect } from "react";
import { CsvParserService, CsvQuestionRow } from "../lib/csvtotext";
import { Stepper } from "./Stepper";

export default function HomePage() {
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [questions, setQuestions] = useState<CsvQuestionRow[]>([]);
  // State for answers (mirrors questions, but with answer field filled)
  const [answers, setAnswers] = useState<CsvQuestionRow[]>([]);
  const [timer, setTimer] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [startDate, setStartDate] = useState<string | null>(null);

  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuvrm_cgpP041ZDnE0TlUsP_W-ttiem9H8UvcIBBYU_8C-VPNj_pe637_lqEmuyZpG959wbaCjouhx/pub?gid=1408408602&single=true&output=csv";

  async function fetchAndParseCSV(url: string): Promise<CsvQuestionRow[]> {
    const response = await fetch(url);
    const csvText = await response.text();
    const parser = new CsvParserService();
    return parser.parse(csvText);
  }

  useEffect(() => {
    fetchAndParseCSV(CSV_URL).then((parsed) => {
      setQuestions(parsed);
      // Deep copy for answers, ensure answer field is empty
      setAnswers(parsed.map((q) => ({ ...q, answer: "" })));
    });
  }, []);

  const totalSteps = 5 + questions.length - 1; // 4 info/user steps + questions + finish

  return (
    <main className="max-screen-90 flex flex-col items-center justify-center">
      <div className="main-card">
        <h1 className="title">Prueba 16PF</h1>
        <Stepper
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          questions={questions}
          answers={answers}
          timer={timer}
          setTimer={setTimer}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          totalSteps={totalSteps}
          setAnswers={setAnswers}
          startDate={startDate}
          setStartDate={setStartDate}
        />
      </div>
    </main>
  );
}
