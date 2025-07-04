import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { name, email, startDate, totalTime, answers } = await req.json();

  if (!name || !email || !startDate || !answers || !totalTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Dynamically import xlsx to avoid type issues
  // @ts-expect-error: no types for xlsx
  const mod = (await import("xlsx"));
  const XLSX = mod.default || mod;

  // Prepare XLSX data
  const xlsxData = [
    ["number", "question", "a", "b", "c", "answer"],
    ...(answers as Array<any>).map((row: any, idx: number) => [
      idx + 1,
      row.question,
      row.a,
      row.b,
      row.c,
      row.answer || ""
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(xlsxData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const xlsxBase64 = Buffer.from(xlsxBuffer).toString("base64");

  // Email body
  const emailHtml = `
    <p>Hola !</p>
    <p>Adjunto encontrarás los resultados de la prueba 16PF realizada por <strong>${name}</strong>,</p>
    <ul>
      <li><strong>Nombre:</strong> ${name}</li>
      <li><strong>Fecha de inicio:</strong> ${startDate}</li>
      <li><strong>Tiempo total:</strong> ${totalTime}</li>
    </ul>
    <p>Gracias por utilizar nuestra plataforma.</p>
    <hr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: [email],
      subject: `Resultados de la prueba 16PF de ${name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `16pf-resultados-${name.replace(/\s+/g, "_")}.xlsx`,
          content: xlsxBase64,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    });
    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
    return NextResponse.json({ success: true, data, xlsx: xlsxBase64 }, { status: 200 });
  } catch (error) {
    console.error("Catch block error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
