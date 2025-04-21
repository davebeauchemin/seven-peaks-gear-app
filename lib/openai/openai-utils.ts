import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an enhanced product description using OpenAI
 *
 * @param product The product object with basic information
 * @returns A more detailed product description
 */
export async function generateProductDescription(product: {
  title: string;
  category: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}): Promise<string> {
  try {
    // Format metadata as key-value pairs for the prompt, if available
    let metadataText = "";
    if (product.metadata && Object.keys(product.metadata).length > 0) {
      metadataText = "Additional Details:\n";
      for (const [key, value] of Object.entries(product.metadata)) {
        if (value !== undefined) {
          metadataText += `- ${key.replace(/_/g, " ")}: ${value}\n`;
        }
      }
    }

    const prompt = `
    Create a compelling product description for a bicycle product with the following details:
    
    Product: ${product.title}
    Category: ${product.category}
    ${metadataText}
    
    The description should:
    - Be 2-3 sentences long
    - Highlight the product's key features and benefits
    - Mention it's part of Seven Peaks Gear, a bicycle company with summer accessories
    - Sound professional but enthusiastic
    - Be suitable for an e-commerce store
    
    Only return the description text, no additional formatting.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional product description writer for a bicycle accessories company.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content?.trim() ||
      `${product.title} - ${product.category} - Premium bicycle accessory from Seven Peaks Gear.`
    );
  } catch (error) {
    console.error("Error generating product description:", error);
    // Fallback to a basic description if OpenAI call fails
    return `${product.title} - ${product.category} - Premium bicycle accessory from Seven Peaks Gear.`;
  }
}
