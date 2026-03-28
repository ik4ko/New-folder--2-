'use server';
/**
 * @fileOverview A Genkit flow for proactively identifying clients who might need a policy review or new coverage.
 *
 * - predictClientChurn - A function that handles the client churn prediction process.
 * - ClientChurnPredictionInput - The input type for the predictClientChurn function.
 * - ClientChurnPredictionOutput - The return type for the predictClientChurn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClientChurnPredictionInputSchema = z.object({
  clientAge: z.number().describe('The client\'s current age.'),
  lastReviewDate: z
    .string()
    .optional()
    .describe(
      'The date of the client\'s last policy review in "YYYY-MM-DD" format. Optional.'
    ),
});
export type ClientChurnPredictionInput = z.infer<
  typeof ClientChurnPredictionInputSchema
>;

const ClientChurnPredictionOutputSchema = z.object({
  needsReview: z
    .boolean()
    .describe('Whether the client needs a policy review or new coverage.'),
  reason: z
    .string()
    .describe('The primary reason why the client needs a review or new coverage.'),
  suggestedAction: z
    .string()
    .describe('A suggested action for the agent to take based on the identified need.'),
});
export type ClientChurnPredictionOutput = z.infer<
  typeof ClientChurnPredictionOutputSchema
>;

export async function predictClientChurn(
  input: ClientChurnPredictionInput
): Promise<ClientChurnPredictionOutput> {
  return clientChurnPredictionFlow(input);
}

const predictClientChurnPrompt = ai.definePrompt({
  name: 'predictClientChurnPrompt',
  input: {schema: ClientChurnPredictionInputSchema},
  output: {schema: ClientChurnPredictionOutputSchema},
  prompt: `You are an AI assistant tasked with identifying clients who might need a policy review or new coverage to prevent churn.

Analyze the following client data and determine if a review is needed, provide a clear reason, and suggest an action for the agent.

Rules for identifying needs:
1. If the client's age is 64 or older, they likely need a review for Medicare or retirement planning. This is a high priority.
2. If the client's last policy review date is 11 months ago or more, they need a review due to inactivity. Assume current date is {{currentDate}}.

Client Data:
- Current Age: {{{clientAge}}}
- Last Policy Review Date: {{{lastReviewDate}}}

Consider the current date as {{currentDate}} when evaluating the last policy review date.

If the client needs a review, set 'needsReview' to true, provide a concise 'reason' (e.g., "Approaching Medicare eligibility" or "Overdue for policy review"), and a 'suggestedAction' (e.g., "Schedule Medicare consultation" or "Contact client for review"). If no review is needed, set 'needsReview' to false, and the reason and suggestedAction can be an empty string.
`,
});

const clientChurnPredictionFlow = ai.defineFlow(
  {
    name: 'clientChurnPredictionFlow',
    inputSchema: ClientChurnPredictionInputSchema,
    outputSchema: ClientChurnPredictionOutputSchema,
  },
  async input => {
    // Get the current date in YYYY-MM-DD format for the prompt to use in calculations
    const currentDate = new Date().toISOString().split('T')[0];

    const {output} = await predictClientChurnPrompt({
      ...input,
      currentDate: currentDate,
    });
    return output!;
  }
);
