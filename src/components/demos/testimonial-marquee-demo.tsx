import { TestimonialMarquee, type Testimonial } from "@/components/ui/testimonial-marquee";

const testimonials: Testimonial[] = [
  {
    quote: "We replaced three tools with this and our onboarding time dropped by half.",
    name: "Amara Okafor",
    role: "Head of Ops, Northwind",
    rating: 5,
  },
  {
    quote: "The cleanest handoff from design to code we have ever had. Our devs actually smile now.",
    name: "Daniel Reyes",
    role: "Design Lead, Lumen",
    rating: 5,
  },
  {
    quote: "Setup took an afternoon. Support answered in minutes, not days.",
    name: "Priya Nair",
    role: "Founder, Sprout Studio",
    rating: 4,
  },
  {
    quote: "Our conversion rate went up 18% after we rebuilt the landing page with it.",
    name: "Tom Becker",
    role: "Growth, Fieldwork",
    rating: 5,
  },
  {
    quote: "Finally a library that looks good out of the box and still bends to our brand.",
    name: "Sofia Lindqvist",
    role: "Brand Designer, Oslo Co.",
    rating: 5,
  },
  {
    quote: "Accessible by default. Our audit came back with zero blockers.",
    name: "Kwame Mensah",
    role: "Frontend Engineer, Arc",
    rating: 5,
  },
  {
    quote: "It feels premium without being heavy. Pages still load in under a second.",
    name: "Mei Tanaka",
    role: "CTO, Kumo",
    rating: 4,
  },
  {
    quote: "I sent the link to our whole team and everyone asked where it came from.",
    name: "Leo Martins",
    role: "Product Manager, Brisa",
    rating: 5,
  },
];

export default function TestimonialMarqueeDemo() {
  return (
    <div className="w-full py-8">
      <TestimonialMarquee
        heading="Loved by teams who ship"
        subheading="Hover a row to pause it. With reduced motion on, it becomes a scrollable list."
        testimonials={testimonials}
        rows={2}
        duration={45}
      />
    </div>
  );
}
