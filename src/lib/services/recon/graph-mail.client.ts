export interface GraphMessageSummary {
  id: string;
  subject: string;
  bodyPreview: string;
  bodyContent: string;
  receivedDateTime: string;
  fromAddress: string;
}

export interface GraphMessageDetail {
  id: string;
  subject: string;
  receivedDateTime: string;
  fromAddress: string;
  bodyContent: string;
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
  "@odata.nextLink"?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapMessages(list: GraphMessagesResponse["value"]): GraphMessageSummary[] {
  return (list ?? []).map((m) => {
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

async function fetchMessagesPage(accessToken: string, url: string): Promise<GraphMessagesResponse> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph messages failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GraphMessagesResponse;
}

export async function fetchRecentMessages(
  accessToken: string,
  top: number,
  skip = 0
): Promise<GraphMessageSummary[]> {
  const first = new URL("https://graph.microsoft.com/v1.0/me/messages");
  first.searchParams.set("$top", "50");
  first.searchParams.set("$orderby", "receivedDateTime desc");
  first.searchParams.set("$select", "id,subject,bodyPreview,body,receivedDateTime,from");
  if (skip > 0) {
    first.searchParams.set("$skip", String(skip));
  }

  let nextUrl: string | undefined = first.toString();
  const out: GraphMessageSummary[] = [];

  while (nextUrl && out.length < top) {
    const page = await fetchMessagesPage(accessToken, nextUrl);
    out.push(...mapMessages(page.value ?? []));
    nextUrl = page["@odata.nextLink"];
    if (!page.value?.length) break;
  }

  return out.slice(0, top);
}

export async function fetchMessagesSince(
  accessToken: string,
  sinceIso: string,
  maxMessages = 1000,
  skip = 0
): Promise<GraphMessageSummary[]> {
  const first = new URL("https://graph.microsoft.com/v1.0/me/messages");
  first.searchParams.set("$top", "50");
  first.searchParams.set("$orderby", "receivedDateTime desc");
  first.searchParams.set("$select", "id,subject,bodyPreview,body,receivedDateTime,from");
  first.searchParams.set("$filter", `receivedDateTime ge ${sinceIso}`);
  if (skip > 0) {
    first.searchParams.set("$skip", String(skip));
  }

  let nextUrl: string | undefined = first.toString();
  const out: GraphMessageSummary[] = [];

  while (nextUrl && out.length < maxMessages) {
    const page = await fetchMessagesPage(accessToken, nextUrl);
    out.push(...mapMessages(page.value ?? []));
    nextUrl = page["@odata.nextLink"];
    if (!page.value?.length) break;
  }

  return out.slice(0, maxMessages);
}

export async function fetchMessageById(
  accessToken: string,
  messageId: string
): Promise<GraphMessageDetail> {
  const url = new URL(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set("$select", "id,subject,body,receivedDateTime,from");
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph message failed: ${res.status} ${text}`);
  }
  const m = (await res.json()) as {
    id: string;
    subject?: string;
    body?: { content?: string; contentType?: string };
    receivedDateTime?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
  };
  const rawBody = m.body?.content ?? "";
  const content = m.body?.contentType?.toLowerCase() === "html" ? stripHtml(rawBody) : rawBody;
  return {
    id: m.id,
    subject: m.subject ?? "",
    receivedDateTime: m.receivedDateTime ?? "",
    fromAddress: m.from?.emailAddress?.address?.toLowerCase() ?? "",
    bodyContent: content || "",
  };
}

export async function fetchGraphUserEmail(accessToken: string): Promise<string | null> {
  const me = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!me.ok) return null;
  const meJson = (await me.json()) as { mail?: string; userPrincipalName?: string };
  return meJson.mail ?? meJson.userPrincipalName ?? null;
}
