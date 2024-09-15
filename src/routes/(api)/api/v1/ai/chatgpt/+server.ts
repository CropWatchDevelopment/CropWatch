import { PRIVATE_CHATGPT_SECRET_KEY, PRIVATE_CHATGPT_ORG_ID, PRIVATE_CHATGPT_PROJECT_ID } from "$env/static/private";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import OpenAI from "openai";

/*
SAMPLE RESPONSE:


'{"id":"chatcmpl-A4J1ScDLgTdRTIboZkCJVx5eM6ZWx","object":"chat.completion","created":1725589798,"model":"gpt-3.5-turbo-0125","choices":[{"index":0,"message":{"role":"assistant","content":"Weekly Report for Pepper Greenhouse in Miyazaki, Japan (September 6, 2024):\\n\\n- Soil Temperature: 19.9 °C\\n- Soil Moisture: 70.6 %\\n- Soil EC: 869 µS/cm\\n- Soil pH: 9 pH\\n- Soil Nitrogen: 83 mg/kg\\n- Soil Phosphorus: 221 mg/kg\\n- Soil Potassium: 388 mg/kg\\n\\nAnalysis:\\n- The soil temperature is within a suitable range for pepper plants.\\n- The soil moisture level is adequate at 70.6%, providing enough hydration for the plants.\\n- The EC value of 869 µS/cm indicates a high level of soluble salts in the soil, which could potentially affect plant growth.\\n- The soil pH is quite high at 9, indicating alkalinity which may impact nutrient availability for the plants.\\n- The levels of nitrogen, phosphorus, and potassium are within acceptable ranges for pepper plants.\\n\\nRecommendations:\\n1. Monitor and adjust the soil EC levels by ensuring proper irrigation practices and avoiding excessive use of fertilizers.\\n2. Consider amending the soil pH to a more neutral level (around 6.5-7) to optimize nutrient uptake by the plants.\\n3. Regularly test the soil nutrient levels and adjust fertilizer application accordingly to maintain adequate nitrogen, phosphorus, and potassium levels.\\n4. Implement mulching practices to help retain soil moisture and prevent nutrient leaching.\\n\\nBy implementing these recommendations, you can improve the growing conditions in your pepper greenhouse and promote healthy plant growth. Remember to regularly monitor and adjust these factors to ensure optimal conditions for your pepper plants.","refusal":null},"logprobs":null,"finish_reason":"stop"}],"usage":{"prompt_tokens":122,"completion_tokens":332,"total_tokens":454},"system_fingerprint":null}'



*/

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }
    const client = new OpenAI({
        organization: PRIVATE_CHATGPT_ORG_ID,
        project: PRIVATE_CHATGPT_PROJECT_ID,
        apiKey: PRIVATE_CHATGPT_SECRET_KEY
    });

    try {
//         const chatCompletion = await client.chat.completions.create({
//             messages: [{
//                 role: 'user', content: `Generate a weekly report for my pepper greenhouse based on the following environmental data:
// Date: September 6, 2024
// Location: Miyazaki, Japan

// Soil Temperature: 19.9 °C
// Soil Moisture: 70.6 %
// Soil EC: 869 µS/cm
// Soil pH: 9 pH
// Soil Nitrogen: 83 mg/kg
// Soil Phosphorus: 221 mg/kg
// Soil Potassium: 388 mg/kg
// Please analyze the data and provide recommendations for improving growing conditions. Please respond in Japanese.
// ` }],
//             model: 'gpt-3.5-turbo',
//         });
        const chatCompletion = JSON.parse(`{"id":"chatcmpl-A4J1ScDLgTdRTIboZkCJVx5eM6ZWx","object":"chat.completion","created":1725589798,"model":"gpt-3.5-turbo-0125","choices":[{"index":0,"message":{"role":"assistant","content":"Weekly Report for Pepper Greenhouse in Miyazaki, Japan (September 6, 2024):\\n\\n- Soil Temperature: 19.9 °C\\n- Soil Moisture: 70.6 %\\n- Soil EC: 869 µS/cm\\n- Soil pH: 9 pH\\n- Soil Nitrogen: 83 mg/kg\\n- Soil Phosphorus: 221 mg/kg\\n- Soil Potassium: 388 mg/kg\\n\\nAnalysis:\\n- The soil temperature is within a suitable range for pepper plants.\\n- The soil moisture level is adequate at 70.6%, providing enough hydration for the plants.\\n- The EC value of 869 µS/cm indicates a high level of soluble salts in the soil, which could potentially affect plant growth.\\n- The soil pH is quite high at 9, indicating alkalinity which may impact nutrient availability for the plants.\\n- The levels of nitrogen, phosphorus, and potassium are within acceptable ranges for pepper plants.\\n\\nRecommendations:\\n1. Monitor and adjust the soil EC levels by ensuring proper irrigation practices and avoiding excessive use of fertilizers.\\n2. Consider amending the soil pH to a more neutral level (around 6.5-7) to optimize nutrient uptake by the plants.\\n3. Regularly test the soil nutrient levels and adjust fertilizer application accordingly to maintain adequate nitrogen, phosphorus, and potassium levels.\\n4. Implement mulching practices to help retain soil moisture and prevent nutrient leaching.\\n\\nBy implementing these recommendations, you can improve the growing conditions in your pepper greenhouse and promote healthy plant growth. Remember to regularly monitor and adjust these factors to ensure optimal conditions for your pepper plants.","refusal":null},"logprobs":null,"finish_reason":"stop"}],"usage":{"prompt_tokens":122,"completion_tokens":332,"total_tokens":454},"system_fingerprint":null}`);
        console.log(chatCompletion);

        return new Response(JSON.stringify(chatCompletion), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify(error), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}