import z from "zod";

export const createQuizzSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(50, "Title must not exceed 50 characters"),
});

export const questionArraySchema = z.object({
  questions: z
    .array(
      z
        .object({
          question: z
            .string()
            .min(1, "Question must be at least 1 character")
            .max(200, "Question must not exceed 200 characters"),
          options: z.array(
            z
              .string()
              .min(1, "Option must be at least 1 character")
              .max(100, "Option must not exceed 100 characters")
          ),
          correctAnsIndex: z.number().positive(),
        })
        .superRefine((data, ctx) => {
          if (data.correctAnsIndex < 0 || data.correctAnsIndex >= data.options.length) {
            ctx.addIssue({
              path: ["correctAnsIndex"],
              message: "Answer index must be within the options range",
              code: "custom",
            });
          }
        })
    )
    .min(1, "At least 1 question required")
    .max(20, "Maximum 20 questions allowed"),
});
