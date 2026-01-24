import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um chef nutricionista especializado em receitas para controle glicêmico e saúde de idosos.

Sua tarefa é REFINAR receitas existentes, adicionando detalhes precisos sem alterar a essência da receita.

REGRAS IMPORTANTES:

1. INGREDIENTES:
   - Adicione quantidades EXATAS em g, ml, kg ou unidades específicas
   - Formato: "150g de peito de frango" ou "2 ovos médios (100g)"
   - Mantenha todos os ingredientes originais
   - Não adicione ingredientes novos desnecessários

2. INSTRUÇÕES:
   - Expanda cada passo com DETALHES específicos
   - Inclua tempos: "Cozinhe por 8-10 minutos"
   - Inclua temperaturas: "Em fogo médio (160°C)"
   - Inclua dicas de textura: "até dourar levemente" ou "até engrossar"
   - Mínimo 5 passos, máximo 12 passos
   - Numere os passos

3. NOTAS:
   - Mantenha a dica glicêmica original se existir
   - Adicione: "Rende X porções" no início
   - Seja conciso

Retorne APENAS um JSON válido, sem markdown, no formato:
{
  "ingredients": ["ingrediente com quantidade"],
  "instructions": ["1. Passo detalhado", "2. Próximo passo"],
  "notes": "Rende X porções. [dica original se existir]"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create client with user's token to verify auth
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipeId } = await req.json();
    
    if (!recipeId) {
      return new Response(
        JSON.stringify({ error: "recipeId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Fetch recipe
    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (fetchError || !recipe) {
      return new Response(
        JSON.stringify({ error: "Receita não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt
    const userPrompt = `Refine esta receita:

Título: ${recipe.title}
Categoria: ${recipe.category}

Ingredientes atuais:
${recipe.ingredients.map((i: string) => `- ${i}`).join("\n")}

Instruções atuais:
${recipe.instructions.map((i: string, idx: number) => `${idx + 1}. ${i}`).join("\n")}

Notas: ${recipe.notes || "Nenhuma"}

Retorne o JSON refinado:`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Error:", aiResponse.status, errorText);
      throw new Error("Erro ao chamar IA");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta da IA vazia");
    }

    // Parse JSON from response (handle markdown code blocks)
    let refinedData;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      refinedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      throw new Error("Erro ao processar resposta da IA");
    }

    // Validate structure
    if (!Array.isArray(refinedData.ingredients) || !Array.isArray(refinedData.instructions)) {
      throw new Error("Formato de resposta inválido");
    }

    // Update recipe
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        ingredients: refinedData.ingredients,
        instructions: refinedData.instructions,
        notes: refinedData.notes || recipe.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Erro ao atualizar receita");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe: {
          id: recipeId,
          title: recipe.title,
          ingredients: refinedData.ingredients,
          instructions: refinedData.instructions,
          notes: refinedData.notes,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
