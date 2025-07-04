/* eslint-disable */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { CsvQuestionRow } from "../lib/csvtotext";

interface StepperProps {
  userInfo: { name: string; email: string };
  setUserInfo: (info: { name: string; email: string }) => void;
  questions: CsvQuestionRow[];
  answers: CsvQuestionRow[];
  timer: number;
  setTimer: React.Dispatch<React.SetStateAction<number>>;
  startDate: string | null;
  setStartDate: (d: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  setAnswers?: (answers: CsvQuestionRow[]) => void; // Optional for answer updates
}

export const Stepper: React.FC<StepperProps> = ({
  userInfo,
  setUserInfo,
  questions,
  answers,
  timer,
  setTimer,
  startDate,
  setStartDate,
  currentStep,
  setCurrentStep,
  totalSteps,
  setAnswers,
}) => {
  let content: React.ReactNode = null;
  let canGoNext = true;
  let nextButtonText = "Siguiente";
  const showNext =
    [0, 1, 2, 3].includes(currentStep) ||
    (currentStep >= 4 && currentStep < 4 + questions.length) ||
    currentStep === totalSteps - 1;

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent going back after timer starts, except allow on all but the first question
  const isFirstQuestionStep = currentStep === 4;
  const canGoBack = currentStep > 0 && !(timerActive && isFirstQuestionStep);

  // Store timer at finish for summary
  const [finalTime, setFinalTime] = useState<number | null>(null);
  // Email sending status
  const [emailStatus, setEmailStatus] = useState<
    null | "sending" | "success" | "error"
  >(null);
  const [xlsxBase64, setXlsxBase64] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer on pressing Start in step 3
  function handleStart() {
    // Record start date/time
    const now = new Date();
    const formatted = `${now.getDate().toString().padStart(2, "0")}/${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${now.getFullYear()} ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setStartDate(formatted);
    setTimer(0);
    setTimerActive(true);
    setCurrentStep(currentStep + 1);
  }

  // Timer effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimer((prev: number) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, setTimer]);

  // Stop timer on finish
  async function handleFinish() {
    if (timerActive) setTimerActive(false);
    setFinalTime(timer); // Store the timer value at finish
    // For last question, log and call API (to be implemented)
    const qIdx = currentStep - 4;
    if (answers[qIdx]) {
      console.log("Current question object (Finish):", answers[qIdx]);
    }
    // Send email
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userInfo.name,
          email: userInfo.email,
          startDate: startDate,
          totalTime: formatTimer(timer),
          answers: answers,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setEmailStatus("success");
        setXlsxBase64(result.xlsx || null);
      } else {
        setEmailStatus("error");
        setXlsxBase64(result.xlsx || null);
      }
    } catch (e) {
      setEmailStatus("error");
    }
    setCurrentStep(currentStep + 1);
  }

  // Resend email logic with cooldown
  async function handleResendEmail() {
    if (resendCooldown > 0) return;
    setEmailStatus("sending");
    setResendCooldown(20);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userInfo.name,
          email: userInfo.email,
          startDate: startDate,
          totalTime:
            finalTime !== null ? formatTimer(finalTime) : formatTimer(timer),
          answers: answers,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setEmailStatus("success");
        setXlsxBase64(result.xlsx || null);
      } else {
        setEmailStatus("error");
        setXlsxBase64(result.xlsx || null);
      }
    } catch (e) {
      setEmailStatus("error");
    }
  }

  // Download XLSX helper
  function handleDownloadXLSX() {
    if (!xlsxBase64) return;
    const byteCharacters = atob(xlsxBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `16pf-resultados-${userInfo.name.replace(/\s+/g, "_")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  // Format timer mm:ss
  function formatTimer(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const [finishClicked, setFinishClicked] = useState(false);

  switch (true) {
    case currentStep === 0:
      content = (
        <div>
          <h1 className="stepper-title font-bold">
            Bienvenidos al test de personalidad 16PF
          </h1>
          <h4 className="stepper-text">
            Para comenzar deberás ingresar tu nombre y el email donde enviarás
            los resultados
          </h4>
          <h4 className="stepper-text">
            No hay límite de tiempo, pero se medirá cuanto estarás en el test.
          </h4>
        </div>
      );
      break;
    case currentStep === 1: {
      canGoNext = !!userInfo.name && emailRegex.test(userInfo.email);
      content = (
        <div className="stepper-form">
          <label className="stepper-label w-full">
            <span className="block font-semibold label-text">
              Nombre Completo
            </span>
            <input
              type="text"
              className="stepper-input w-full label-text"
              value={userInfo.name}
              onChange={(e) =>
                setUserInfo({ ...userInfo, name: e.target.value })
              }
              placeholder="Pon tu nombre completo"
            />
          </label>
          <label className="stepper-label w-full">
            <span className="block font-semibold label-text">
              Email para enviar resultados
            </span>
            <input
              type="email"
              className="stepper-input w-full label-text"
              value={userInfo.email}
              onChange={(e) =>
                setUserInfo({ ...userInfo, email: e.target.value })
              }
              placeholder="Ingresa el email donde enviarás los resultados"
            />
          </label>
          <div className="stepper-hint">
            Los resultados serán enviados a este email.
          </div>
          {userInfo.email && !emailRegex.test(userInfo.email) && (
            <div className="stepper-error">
              Por favor, ingresa un email válido.
            </div>
          )}
        </div>
      );
      break;
    }
    case currentStep === 2:
      content = (
        <div>
          <h1 className="stepper-title font-bold">Instrucciones</h1>

          <h4 className="stepper-text">
            A continuación encontrará una serie de frases que permitirán conocer
            sus actitudes e intereses.
          </h4>
          <h4 className="stepper-text">
            Cada frase contiene tres respuestas posibles (A, B, C) y normalmente
            la alternativa B viene con un interrogante, para ser señalada cuando
            no es posible decidirse entre la A y la C.
          </h4>
          <h4 className="stepper-text">
            No existen respuestas correctas o incorrectas, porque las personas
            tienen distintos intereses y ven las cosas desde distintos puntos de
            vista.
          </h4>
          <h4 className="stepper-text">
            Conteste con sinceridad, de esta forma se podrá conocer mejor su
            forma de ser.
          </h4>
          <h4 className="stepper-text">
            Lea atentamente cada frase y las posibles respuestas, así le será
            más fácil decidirse.
          </h4>
          <h4 className="stepper-text">
            Ahora lea los ejemplos que vienen aquí debajo para hacer un poco de
            práctica, y piense cómo los contestaría.
          </h4>
          <h4 className="stepper-text">
            Si tiene dudas pregunte al examinador.{" "}
          </h4>
        </div>
      );
      break;
    case currentStep === 3:
      content = (
        <div>
          <p className="stepper-title font-bold">
            Al contestar tenga en cuenta lo siguiente:
          </p>
          <p className="stepper-subtitle">
            No piense demasiado el contenido de las frases, ni emplee mucho
            tiempo en decidirse. Las frases son muy cortas para darle todos los
            detalles que usted quisiera; por ejemplo, se ha puesto &quot;presenciar
            una competición deportiva&quot;, tal vez a usted le guste más el fútbol
            que el baloncesto; debe contestar pensando en que es habitual para
            usted. Generalmente se contestan cinco o seis por minuto, y se tarda
            poco más de media hora para completar el cuestionario.
          </p>
          <p className="stepper-subtitle">
            Evite señalar la respuesta B (¿?), excepto cuando le sea imposible
            decidirse por las otras dos; lo corriente es que esto le ocurra sólo
            en muy pocas frases.
          </p>
          <p className="stepper-subtitle">
            Procure no dejar ninguna pregunta sin contestar. Es posible que
            alguna no tenga nada que ver con usted (porque no se aplica
            perfectamente a su caso); intente elegir la respuesta que vaya mejor
            con su modo de ser. Tal vez algunas frases le parezcan muy
            personales; no se preocupe y recuerde que las Hojas de Respuesta se
            guardan como documentos confidenciales y no pueden ser valoradas sin
            una plantilla especial. Por otra parte, al obtener los resultados no
            se consideran las respuestas una a una, sino globalmente.
          </p>
          <p className="stepper-subtitle">
            Conteste sinceramente. No señale sus respuestas pensando en lo que
            es &quot;bueno&quot; o lo que &quot;interesa&quot; para impresionar al examinador.
            Además el cuestionario se desarrolló para ser sensible a respuestas
            contradictorias.
          </p>
        </div>
      );
      nextButtonText = "Comenzar";
      break;
    case currentStep >= 4 && currentStep < 4 + questions.length: {
      const qIdx = currentStep - 4;
      const q = questions[qIdx];
      const answer = answers[qIdx]?.answer || "";
      canGoNext = !!answer;
      content = (
        <div className="stepper-container-question">
          <div className="stepper-progress">
            Pregunta: {qIdx + 1} de {questions.length}
          </div>
          <div className="stepper-question font-semibold">{q.question}</div>
          <div className="stepper-options">
            {["a", "b", "c"].map((opt) => (
              <label key={opt} className="stepper-option">
                <input
                  type="radio"
                  name={`question-${qIdx}`}
                  value={opt}
                  checked={answer === opt}
                  onChange={() => {
                    if (setAnswers) {
                      const updated = answers.map((row, idx) =>
                        idx === qIdx ? { ...row, answer: opt } : row
                      );
                      setAnswers(updated);
                    }
                  }}
                />
                <span>{q[opt as keyof CsvQuestionRow]}</span>
              </label>
            ))}
          </div>
          <div className="stepper-timer">
            Tiempo transcurrido: {formatTimer(timer)}
          </div>
        </div>
      );
      if (currentStep === (4 + questions.length - 1)) {
        nextButtonText = "Terminar";
      }
      break;
    }
    case currentStep === 4 + questions.length:
      content = (
        <div className="stepper-finish-container">
          <div className="stepper-finish-title">¡Proceso finalizado!</div>
          <div className="stepper-finish-time">
            Tiempo total:{" "}
            <span className="font-mono">
              {finalTime !== null ? formatTimer(finalTime) : formatTimer(timer)}
            </span>
          </div>
          <div className="stepper-finish-thanks">
            Gracias por completar el test.
          </div>
          <div className="stepper-finish-warning font-semibold">
            Te recomendamos descargar el archivo de resultados por si el email
            no llega correctamente.
          </div>
          {xlsxBase64 && (
            <button
              onClick={handleDownloadXLSX}
              className="stepper-button-download"
            >
              Descargar archivo XLSX
            </button>
          )}
          {emailStatus === "sending" && (
            <div className="stepper-email-sending">Enviando email...</div>
          )}
          {emailStatus === "success" && (
            <div className="stepper-email-success">
              ¡Email enviado exitosamente!
            </div>
          )}
          {emailStatus === "error" && (
            <div className="stepper-email-error-group">
              <div className="stepper-email-error">
                Error al enviar el email.
              </div>
              <button
                onClick={handleResendEmail}
                className={`stepper-button-resend${
                  resendCooldown > 0 ? " stepper-button-disabled" : ""
                }`}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Reintentar en ${resendCooldown}s`
                  : "Reenviar email"}
              </button>
            </div>
          )}
        </div>
      );
      nextButtonText = "Finish";
      break;
    default:
      content = <div>Unknown Step</div>;
  }

  function handleNext() {
    // For question steps, log the current question object
    if (currentStep === 1) {
      console.log("User info:", userInfo);
    }
    if (currentStep === 3) {
      handleStart();
      return;
    }
    if (currentStep >= 4 && currentStep < 4 + questions.length) {
      const qIdx = currentStep - 4;
      if (answers[qIdx]) {
        // Log the current question object with answer
        console.log("Current question object:", answers[qIdx]);
      }
    }
    setCurrentStep(currentStep + 1);
  }

  // Wrapped finish handler to prevent double click
  async function handleFinishOnce() {
    if (finishClicked) return;
    setFinishClicked(true);
    await handleFinish();
    setFinishClicked(false); // Optionally reset if you want to allow retry on error
  }

  return (
    <div className="stepper-root">
      {content}
      <div className="stepper-actions">
        {canGoBack && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className={`stepper-button stepper-button-back${
              !canGoBack ? " stepper-button-disabled" : ""
            }`}
            disabled={!canGoBack}
          >
            Anterior
          </button>
        )}
        <button
          onClick={() =>
            setCurrentStep(questions.length > 0 ? 4 + questions.length - 1 : 4)
          }
          className={`stepper-button stepper-button-debug${
            currentStep === 3 ? " stepper-button-disabled" : ""
          }`}
          disabled={currentStep === 3}
        >
          Go to Last Question (Debug)
        </button>
        {showNext &&
          ((currentStep === (4 + questions.length - 1)) ? (
            <button
              onClick={handleFinishOnce}
              className={`stepper-button stepper-button-finish${
                finishClicked ||
                (currentStep >= 4 &&
                  currentStep < 4 + questions.length &&
                  !canGoNext)
                  ? " stepper-button-disabled"
                  : ""
              }`}
              disabled={
                finishClicked ||
                (currentStep >= 4 &&
                  currentStep < 4 + questions.length &&
                  !canGoNext)
              }
            >
              {finishClicked ? "Procesando..." : nextButtonText}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`stepper-button stepper-button-next${
                (currentStep === 1 && !canGoNext) ||
                (currentStep >= 4 &&
                  currentStep < 4 + questions.length &&
                  !canGoNext)
                  ? " stepper-button-disabled"
                  : ""
              }`}
              disabled={
                (currentStep === 1 && !canGoNext) ||
                (currentStep >= 4 &&
                  currentStep < 4 + questions.length &&
                  !canGoNext)
              }
            >
              {nextButtonText}
            </button>
          ))}
      </div>
    </div>
  );
};
