import { ImageResponse } from "next/og";

export const alt = "EMP Workforce OS";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top right, rgba(45,212,191,0.22), transparent 24%), radial-gradient(circle at bottom left, rgba(250,204,21,0.18), transparent 26%), linear-gradient(180deg, #0f172a 0%, #111827 100%)",
          color: "white",
          padding: "56px",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "36px",
            padding: "40px",
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                height: "58px",
                width: "58px",
                borderRadius: "999px",
                background: "white",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 700
              }}
            >
              E
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "18px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#94a3b8" }}>
                Workforce OS / Company OS
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700 }}>EMP Workforce OS</span>
            </div>
          </div>

          <div style={{ maxWidth: "820px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <span style={{ fontSize: "68px", lineHeight: 1.05, fontWeight: 700 }}>
              Replace fragmented workforce workflows with one operating system.
            </span>
            <span style={{ fontSize: "28px", lineHeight: 1.4, color: "#cbd5e1" }}>
              Org structure, attendance, leave, approvals, payroll support, collaboration, and executive insight in one connected platform.
            </span>
          </div>

          <div style={{ display: "flex", gap: "18px" }}>
            {["Attendance", "Leave", "Approvals", "Analytics", "Knowledge"].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "999px",
                  padding: "14px 20px",
                  fontSize: "20px",
                  color: "#e2e8f0",
                  background: "rgba(255,255,255,0.05)"
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
