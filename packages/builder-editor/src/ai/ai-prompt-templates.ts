/**
 * AI Prompt Templates — quick-start examples for different use cases.
 *
 * Users can select a template to auto-fill their prompt with a detailed,
 * industry-specific example. This replaces the complex settings panel.
 */

export interface PromptTemplate {
  id: string;
  label: string;
  category: string;
  prompt: string;
  icon?: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "product-saas",
    label: "SaaS Product",
    category: "product",
    prompt: `Create a modern SaaS landing page for a productivity tool. Include:
- Hero section with headline "Streamline Your Workflow" and CTA button
- Features section highlighting 3 key capabilities: Task Management, Collaboration, Analytics
- Stats section showing usage metrics (2M+ users, 99.9% uptime, 50+ integrations)
- Testimonials from satisfied customers
- Pricing tiers: Basic ($29/mo), Professional ($79/mo), Enterprise (contact us)
- Final CTA section encouraging trial signup
Use a clean, professional design with blue and white colors.`,
  },
  {
    id: "product-ecommerce",
    label: "E-commerce Store",
    category: "product",
    prompt: `Design a modern e-commerce product landing page. Include:
- Eye-catching hero with product image
- Product features in a 2-column comparison layout
- Customer testimonials showing 5-star reviews
- Related products section with 3 items
- Clear call-to-action "Add to Cart" and "Buy Now"
- Footer with shipping info and returns policy
Use warm, inviting colors (orange and cream) that convey trust and quality.`,
  },
  {
    id: "education-online",
    label: "Online Course",
    category: "education",
    prompt: `Create an online learning platform homepage. Include:
- Header with course title and instructor name
- Hero section explaining course benefits
- Course curriculum with 5 modules
- Student success stories and testimonials
- FAQ section addressing common questions
- Enrollment CTA and pricing display
- Footer with contact and social links
Use an academic, clean design with green accents for growth and learning.`,
  },
  {
    id: "education-university",
    label: "University/School",
    category: "education",
    prompt: `Design a university landing page. Include:
- Header navigation with logo
- Hero section with university name and mission statement
- Featured programs section (4 programs)
- Campus facilities showcase (images of buildings, library, sports)
- Faculty highlights (3-4 key professors)
- Admissions CTA and contact form
- Footer with location and contact info
Use a prestigious, academic design with navy blue and gold.`,
  },
  {
    id: "tech-startup",
    label: "Tech Startup",
    category: "tech",
    prompt: `Create a cutting-edge tech startup website. Include:
- Bold hero section with company tagline
- The problem being solved
- The innovative solution
- Key features (minimum 4)
- Technology stack overview
- Team introduction (3-5 founding members)
- Press mentions or investor logos
- Beta signup CTA
Use a modern, tech-forward design with dark background and neon accents.`,
  },
  {
    id: "tech-ai",
    label: "AI/ML Product",
    category: "tech",
    prompt: `Design an AI product landing page. Include:
- Hero explaining the AI capability
- How it works section (visual step-by-step)
- Use cases (minimum 3 different industries)
- Performance metrics and benchmarks
- Integration examples with popular platforms
- Demo/try it now section
- Pricing plans
- FAQ about AI safety and ethics
Use a sophisticated, tech-advanced design with purple and blue.`,
  },
  {
    id: "automotive-dealer",
    label: "Car Dealership",
    category: "automotive",
    prompt: `Create a car dealership website. Include:
- Hero with featured vehicle showcase
- Featured inventory section (3-4 cars)
- Finance/loan options explainer
- Service department info
- Customer reviews and ratings
- Test drive booking form
- Location and contact information
- Footer with dealership hours
Use a premium, sleek design with black and silver.`,
  },
  {
    id: "automotive-rental",
    label: "Car Rental Service",
    category: "automotive",
    prompt: `Design a car rental service website. Include:
- Hero with booking widget (pick-up/return dates)
- Fleet showcase (economy, comfort, luxury cars)
- Competitive pricing comparison
- Customer testimonials
- Insurance and protection options
- Special offers and seasonal discounts
- FAQ about rental policies
- Multi-location availability
Use a friendly, accessible design with orange and white.`,
  },
  {
    id: "pets-veterinary",
    label: "Veterinary Clinic",
    category: "pets",
    prompt: `Create a veterinary clinic website. Include:
- Friendly hero with clinic name and mission
- Services offered (checkups, vaccinations, surgery, grooming)
- Meet the veterinarians (team profiles)
- Patient testimonials from pet owners
- Appointment booking system
- Emergency services info
- Pet care tips blog
- Location, hours, and contact form
Use a warm, caring design with soft colors (pastels) and friendly imagery.`,
  },
  {
    id: "pets-boarding",
    label: "Pet Boarding/Daycare",
    category: "pets",
    prompt: `Design a pet boarding facility website. Include:
- Hero showing happy pets playing
- Facility tour (photos of play areas, rooms, amenities)
- Services: daycare, boarding, grooming, training
- Daily routine explainer
- Staff bios (certified pet care professionals)
- Customer reviews and pet owner testimonials
- Pricing for different services
- Booking/reservation system
Use a playful, colorful design with pet-friendly colors (paw prints, bright accents).`,
  },
  {
    id: "healthcare-clinic",
    label: "Medical Clinic",
    category: "healthcare",
    prompt: `Create a medical clinic landing page. Include:
- Professional hero with clinic credentials
- Doctor profiles with specialties
- Services offered (general practice, specialists, testing)
- Patient testimonials
- Insurance information and accepted plans
- Online appointment booking
- Patient portal login
- Health tips and educational resources
- Emergency contact information
Use a professional, trustworthy design with blue and green accents.`,
  },
  {
    id: "healthcare-dental",
    label: "Dental Practice",
    category: "healthcare",
    prompt: `Design a dental practice website. Include:
- Welcoming hero with practice name
- Dentist team introductions
- Services (cleanings, implants, cosmetic, emergency)
- Before/after photo gallery
- Patient testimonials
- Appointment scheduling system
- New patient information form
- Insurance and payment options
- Dental health tips blog
Use a bright, clean design with white and light blue (trust and cleanliness).`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "product", label: "Product", color: "#ef4444" },
  { id: "education", label: "Education", color: "#10b981" },
  { id: "tech", label: "Technology", color: "#6366f1" },
  { id: "automotive", label: "Automotive", color: "#8b5cf6" },
  { id: "pets", label: "Pets", color: "#ec4899" },
  { id: "healthcare", label: "Healthcare", color: "#0ea5e9" },
];

export const COLOR_PALETTES = [
  { name: "Blue & White", primary: "#0066ff", secondary: "#ffffff", accent: "#0052cc" },
  { name: "Dark Modern", primary: "#111827", secondary: "#ffffff", accent: "#6366f1" },
  { name: "Green Accent", primary: "#059669", secondary: "#f0fdf4", accent: "#10b981" },
  { name: "Orange Warm", primary: "#ea580c", secondary: "#fef3c7", accent: "#f59e0b" },
  { name: "Purple Elegant", primary: "#7c3aed", secondary: "#f3e8ff", accent: "#a855f7" },
  { name: "Navy Professional", primary: "#1e3a8a", secondary: "#f0f9ff", accent: "#3b82f6" },
];

export const TONE_STYLES = [
  { id: "professional", label: "Professional", description: "Corporate, trustworthy, formal" },
  { id: "playful", label: "Playful", description: "Fun, friendly, engaging" },
  { id: "minimal", label: "Minimal", description: "Clean, simple, focused" },
  { id: "bold", label: "Bold", description: "Strong, energetic, impactful" },
  { id: "elegant", label: "Elegant", description: "Refined, sophisticated, premium" },
  { id: "modern", label: "Modern", description: "Cutting-edge, tech-forward, trendy" },
];
