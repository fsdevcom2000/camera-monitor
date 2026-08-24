import { connect } from "cloudflare:sockets";

export interface RTSPCheckResult {
  online: boolean;
  tcpLatency: number;
  rtsp: boolean;
  rtspLatency: number | null;
  rtspCode: number | null;
  rtspStatus: string | null;
  error?: string;
}

export async function checkRTSP(
  host: string,
  port: number,
): Promise<RTSPCheckResult> {
  const start = Date.now();

  let socket: ReturnType<typeof connect> | undefined;

  try {
    socket = connect({
      hostname: host,
      port,
    });

    await socket.opened;

    const tcpLatency = Date.now() - start;

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    const request =
      `OPTIONS rtsp://${host}:${port}/ RTSP/1.0\r\n` +
      `CSeq: 1\r\n` +
      `User-Agent: CameraMonitor/1.0\r\n` +
      `\r\n`;

    await writer.write(
      new TextEncoder().encode(request),
    );

    writer.releaseLock();

    let response = "";

    const readResponse = async () => {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          response += new TextDecoder().decode(value);

          if (
            response.includes("\r\n\r\n") ||
            response.length > 8192
          ) {
            break;
          }
        }
      }
    };

    await Promise.race([
      readResponse(),

      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error("RTSP response timeout"),
          );
        }, 5000);
      }),
    ]);

    const rtspLatency = Date.now() - start;

    reader.releaseLock();

    socket.close();

    const firstLine =
      response.split("\r\n")[0] || "";

    const match = firstLine.match(
      /^RTSP\/\d+\.\d+\s+(\d+)\s*(.*)$/i,
    );

    if (!match) {
      return {
        online: true,
        tcpLatency,
        rtsp: false,
        rtspLatency,
        rtspCode: null,
        rtspStatus: null,
        error: "Invalid RTSP response",
      };
    }

    const rtspCode = Number(match[1]);
    const rtspStatus = match[2];

    return {
      online: true,
      tcpLatency,
      rtsp: true,
      rtspLatency,
      rtspCode,
      rtspStatus,
    };

  } catch (error) {

    try {
      socket?.close();
    } catch {}

    return {
      online: false,
      tcpLatency: Date.now() - start,
      rtsp: false,
      rtspLatency: null,
      rtspCode: null,
      rtspStatus: null,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}