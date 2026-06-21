import { Type, type Static } from '@sinclair/typebox';

export const problemDetailsSchema = Type.Object({
  type: Type.String({ format: 'uri' }),
  title: Type.String(),
  status: Type.Integer(),
  detail: Type.Optional(Type.String()),
  instance: Type.Optional(Type.String())
});

export const validationProblemDetailsSchema = Type.Composite([
  problemDetailsSchema,
  Type.Object({
    errors: Type.Array(Type.Unknown())
  })
]);

export type ProblemDetailsSchema = Static<typeof problemDetailsSchema>;
export type ValidationProblemDetailsSchema = Static<
  typeof validationProblemDetailsSchema
>;
