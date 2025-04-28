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

    // const prompt = `
    // Create a compelling product description for a bicycle product with the following details:

    // Product: ${product.title}
    // Category: ${product.category}
    // ${metadataText}

    // The description should:
    // - Be 2-3 sentences long
    // - Highlight the product's key features and benefits
    // - Mention it's part of Seven Peaks Gear, a bicycle company with summer accessories
    // - Sound professional but enthusiastic
    // - Be suitable for an e-commerce store

    // Only return the description text, no additional formatting.
    // `;

    const prompt = `
        Craft a 2-to-3-sentence product description for a *Seven Peaks Gear* summer bicycle.

        **Input placeholders**

        - **Product Title:** ${product.title}  
        - **Category:** ${product.category}  
        - **Key Specs / Benefits:** ${metadataText}

        **Guidelines**

        1. Begin with the bike's standout summer-ready advantage.  
        2. Weave in 2–3 major features or benefits from the specs.  
        3. Naturally reference that it's from **Seven Peaks Gear**, known for summer cycling accessories.  
        4. Maintain a professional yet energetic tone; keep sentences clear and concise.  
        5. Output **only** the description text—no labels, quotes, markdown, or extra spacing.
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

/**
 * Generates a short product description using OpenAI, with the full description as context
 *
 * @param product The product object with basic information
 * @param fullDescription The full product description to use as context
 * @returns A shorter product description
 */
export async function generateShortProductDescription(
  product: {
    title: string;
    category: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  },
  fullDescription: string
): Promise<string> {
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
        Create one clear, punchy sentence (≤ 20 words) that sells a *Seven Peaks Gear* summer bicycle.

        **Input placeholders**

        - **Product Title:** ${product.title}  
        - **Category:** ${product.category}  
        - **Key Specs / Benefits:** ${metadataText}  
        - **Long Description:** ${fullDescription}

        **Rules**

        1. Lead with the bike's strongest benefit or unique summer-ready feature.  
        2. Use simple, active English—no jargon, buzzwords, or complex clauses.  
        3. Keep the tone energetic and credible (avoid hype like "world's best").  
        4. Mention "Seven Peaks Gear" once if it fits naturally; otherwise omit.  
        5. Return **only** the sentence—no labels, quotes, markdown, or extra spacing.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional product copywriter specializing in concise product summaries.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content?.trim() ||
      `${product.title} - Premium bicycle accessory.`
    );
  } catch (error) {
    console.error("Error generating short product description:", error);
    // Fallback to a basic description if OpenAI call fails
    return `${product.title} - Premium bicycle accessory.`;
  }
}

/**
 * Generates a description for a collection using OpenAI
 *
 * @param collection The collection object with basic information
 * @returns A detailed collection description
 */
export async function generateCollectionDescription(collection: {
  title: string;
  productCount?: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}): Promise<string> {
  try {
    // Format metadata as key-value pairs for the prompt, if available
    let metadataText = "";
    if (collection.metadata && Object.keys(collection.metadata).length > 0) {
      metadataText = "Additional Details:\n";
      for (const [key, value] of Object.entries(collection.metadata)) {
        if (value !== undefined) {
          metadataText += `- ${key.replace(/_/g, " ")}: ${value}\n`;
        }
      }
    }

    const prompt = `
        Craft a compelling 3-4 sentence collection description for *Seven Peaks Gear* bicycle.

        **Input placeholders**

        - **Collection Title:** ${collection.title}  
        - **Key Details:** ${metadataText}
        - **About:** About Seven Peaks Gear
                    Ride the Peak of Summer.
                    Founded in 2010, Seven Peaks Gear was born from a simple passion: making the joy of cycling accessible to every rider. From the beginning, we've focused on delivering quality summer bikes that combine performance, durability, and style — all at the right price.
                    We believe the best rides come from the perfect balance of gear and spirit. That's why we're committed to offering not just great bikes, but expert advice, dependable support, and a community where every rider feels at home. Whether you're exploring city streets, winding trails, or pushing your limits on the open road, Seven Peaks is here to help you reach your peak.
                    Driven by quality. Powered by passion. Always ready for the next ride.
        **Guidelines**

        1. Begin with an engaging introduction about what the collection offers cyclists.  
        2. Explain who this collection is ideal for (type of cyclist, experience level, season).
        3. Mention 2-3 key benefits this collection provides to cyclists.
        4. Include that it's from **Seven Peaks Gear**, known for quality summer cycling accessories.
        5. Maintain a professional yet enthusiastic tone throughout with simple english language.
        6. Output **only** the description text—no labels, quotes, markdown, or extra spacing, no formatting.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional copywriter for a bicycle accessories company, creating collection descriptions.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content?.trim() ||
      `The ${collection.title} Collection - A premium selection of bicycle accessories from Seven Peaks Gear designed to enhance your cycling experience.`
    );
  } catch (error) {
    console.error("Error generating collection description:", error);
    // Fallback to a basic description if OpenAI call fails
    return `The ${collection.title} Collection - A premium selection of bicycle accessories from Seven Peaks Gear designed to enhance your cycling experience.`;
  }
}

/**
 * Generates a short description for a collection using OpenAI
 *
 * @param collection The collection object with basic information
 * @param fullDescription The full collection description to use as context
 * @returns A shorter collection description
 */
export async function generateShortCollectionDescription(
  collection: {
    title: string;
    productCount?: number;
    metadata?: Record<string, any>;
    [key: string]: any;
  },
  fullDescription: string
): Promise<string> {
  try {
    // Format metadata as key-value pairs for the prompt, if available
    let metadataText = "";
    if (collection.metadata && Object.keys(collection.metadata).length > 0) {
      metadataText = "Additional Details:\n";
      for (const [key, value] of Object.entries(collection.metadata)) {
        if (value !== undefined) {
          metadataText += `- ${key.replace(/_/g, " ")}: ${value}\n`;
        }
      }
    }

    const prompt = `
        Create one compelling sentence (≤ 25 words) that summarizes a *Seven Peaks Gear* collection.

        **Input placeholders**

        - **Collection Title:** ${collection.title}  
        - **Product Count:** ${collection.productCount || "Multiple"} items  
        - **Key Details:** ${metadataText}  
        - **Long Description:** ${fullDescription}

        **Rules**

        1. Focus on the main benefit or theme that unites this collection.
        2. Use active, engaging language that entices cyclists to explore the collection.
        3. Keep the tone professional and credible while maintaining enthusiasm with simple english language.
        4. Mention "Seven Peaks Gear" once if it fits naturally; otherwise omit.
        5. Return **only** the sentence—no labels, quotes, markdown, or extra spacing.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional copywriter specializing in concise collection summaries for e-commerce.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 75,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content?.trim() ||
      `The ${collection.title} Collection - Essential cycling gear from Seven Peaks Gear.`
    );
  } catch (error) {
    console.error("Error generating short collection description:", error);
    // Fallback to a basic description if OpenAI call fails
    return `The ${collection.title} Collection - Essential cycling gear from Seven Peaks Gear.`;
  }
}
