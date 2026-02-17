import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const ANALYSIS_PROMPT = `You are an expert product researcher analyzing customer interviews.
Analyze these customer interviews and identify clear patterns.

INTERVIEWS:
{interviews}

IMPORTANT: You MUST provide analysis in the EXACT format below. Do not omit any sections.

---

PROBLEMS IDENTIFIED

Problem: [Clear, concise statement of the problem]
Mentioned in: [e.g., 2/3 interviews]
Impact: High/Medium/Low
Evidence:
- "[Direct quote from interview]"
- "[Another direct quote]"

Problem: [Second problem if applicable]
Mentioned in: [e.g., 1/3 interviews]
Impact: High/Medium/Low
Evidence:
- "[Direct quote from interview]"

RECOMMENDED FEATURES

Feature: [What to build to solve this problem]
Why: [How this feature solves the problem]
Effort: Small/Medium/Large
Priority: P0/P1/P2

Feature: [Second feature]
Why: [How this feature solves the problem]
Effort: Small/Medium/Large
Priority: P0/P1/P2

TOP PRIORITY

What to build first: [Single most important feature]
Why: [Reasoning based on customer evidence]
Expected impact: High/Medium/Low
Customer evidence: "[Key quote supporting this decision]"

---

Remember: Include at least 2-3 problems and 2-3 recommended features. Use real quotes from the interviews as evidence.`;

// Helper function to sleep/retry delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's an overloaded error (529) or rate limit
      const isOverloaded = error?.status === 529 ||
                           error?.error?.type === 'overloaded_error' ||
                           error?.message?.includes('overloaded');

      const isRateLimit = error?.status === 429 ||
                          error?.error?.type === 'rate_limit_error';

      if ((isOverloaded || isRateLimit) && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`API overloaded. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const { interviews } = await request.json();

    if (!interviews || !Array.isArray(interviews) || interviews.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one interview transcript' },
        { status: 400 }
      );
    }

    // Filter out empty interviews and limit total length
    const validInterviews = interviews.filter((i: string) => i && i.trim().length > 0);

    if (validInterviews.length === 0) {
      return NextResponse.json(
        { error: 'No valid interview transcripts provided' },
        { status: 400 }
      );
    }

    // Combine interviews with clear separators
    const interviewsText = validInterviews
      .map((text: string, index: number) => `--- Interview ${index + 1} ---\n${text}`)
      .join('\n\n');

    const prompt = ANALYSIS_PROMPT.replace('{interviews}', interviewsText);

    // Call API with retry logic
    const message = await retryWithBackoff(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
    }, 3, 1500);

    // Get text from response
    let analysis = '';
    if (message.content && message.content.length > 0) {
      if (message.content[0]?.type === 'text') {
        analysis = message.content[0].text;
      }
    }

    // Log response for debugging
    console.log('Analysis length:', analysis.length);
    console.log('Analysis preview:', analysis.substring(0, 300));

    return NextResponse.json({
      success: true,
      analysis,
      interviewCount: validInterviews.length
    });

  } catch (error: any) {
    console.error('Analysis error:', error);

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Check if it's an overloaded error after retries
    if (error?.status === 529 || error?.error?.type === 'overloaded_error') {
      return NextResponse.json(
        { error: 'The Anthropic API is currently overloaded. Please wait a moment and try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze interviews. Please try again.' },
      { status: 500 }
    );
  }
}
