export interface GraphMessageSummary {
  id: string;
  subject: string;
  bodyPreview: string;
  bodyContent: string;
  receivedDateTime: string;
  fromAddress: string;
}

interface GraphMessagesResponse {
  value: Array<{
    id: string;
    subject?: string;
    bodyPreview?: string;
    body?: { content?: string; contentType?: string };
    receivedDateTime?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
  }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchRecentMessages(accessToken: string, top: number): Promise<GraphMessageSummary[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$top", String(top));
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set(
    "$select",
    "id,subject,bodyPreview,body,receivedDateTime,from"
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph messages failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as GraphMessagesResponse;
  const list = data.value ?? [];
  return list.map((m) => {
    const rawBody = m.body?.content ?? "";
    const content =
      m.body?.contentType?.toLowerCase() === "html" ? stripHtml(rawBody) : rawBody;
    return {
      id: m.id,
      subject: m.subject ?? "",
      bodyPreview: m.bodyPreview ?? "",
      bodyContent: content || m.bodyPreview || "",
      receivedDateTime: m.receivedDateTime ?? "",
      fromAddress: m.from?.emailAddress?.address?.toLowerCase() ?? "",
    };
  });
}

export async function fetchGraphUserEmail(accessToken: string): Promise<string | null> {
  const me = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!me.ok) return null;
  const meJson = (await me.json()) as { mail?: string; userPrincipalName?: string };
  return meJson.mail ?? meJson.userPrincipalName ?? null;
}
