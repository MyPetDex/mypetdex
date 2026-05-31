export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicRes.json();

    return Response.json(data, { status: anthropicRes.status });
  } catch (error: any) {
    return Response.json(
      { error: { message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
}
