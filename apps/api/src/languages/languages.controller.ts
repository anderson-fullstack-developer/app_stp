import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ZodPipe } from "../common/zod.pipe.js";
import { LanguagesService } from "./languages.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/, "id de língua inválido");
const VocabularyQuery = z.object({
  locale: z.enum(["pt", "en", "fr"]).default("pt"),
  take: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.uuid().optional(),
});

@ApiTags("languages")
@Controller("languages")
export class LanguagesController {
  constructor(private readonly languages: LanguagesService) {}

  @Get()
  @ApiOkResponse({ description: "Países e línguas da plataforma, com o estado de cada língua." })
  list() {
    return this.languages.listCountries();
  }

  @Get(":languageId/vocabulary")
  @ApiOkResponse({
    description: "Vocabulário visível (APPROVED; em Beta inclui rascunhos marcados).",
  })
  vocabulary(
    @Param("languageId", new ZodPipe(LanguageId)) languageId: string,
    @Query(new ZodPipe(VocabularyQuery)) query: z.infer<typeof VocabularyQuery>,
  ) {
    return this.languages.listVocabulary(languageId, query);
  }
}
