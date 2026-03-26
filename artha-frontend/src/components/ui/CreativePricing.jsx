import { Button } from "./Button";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

function CreativePricing({
    tag = "Artha Growth Plans",
    title = "Wealth Management Made Simple",
    description = "Scale your company's fiscal operations with precision",
    tiers,
}) {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-24 relative z-10">
            <div className="text-center space-y-6 mb-20">
                <div className="font-sans text-xl text-blue-600 rotate-[-1deg] font-bold">
                    {tag}
                </div>
                <div className="relative">
                    <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 rotate-[-1deg]">
                        {title}
                        <div className="absolute -right-12 top-0 text-amber-500 rotate-12">
                            ✨
                        </div>
                        <div className="absolute -left-8 bottom-0 text-blue-600 -rotate-12">
                            ⭐️
                        </div>
                    </h2>
                    <div
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-44 h-3 bg-blue-500/10 
                        rotate-[-1deg] rounded-full blur-sm"
                    />
                </div>
                <p className="text-xl text-zinc-600 rotate-[-1deg] max-w-2xl mx-auto">
                    {description}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tiers.map((tier, index) => (
                    <div
                        key={tier.name}
                        className={cn(
                            "relative group",
                            "transition-all duration-300",
                            index === 0 && "rotate-[-1deg]",
                            index === 1 && "rotate-[1deg]",
                            index === 2 && "rotate-[-2deg]"
                        )}
                    >
                        <div
                            className={cn(
                                "absolute inset-0 bg-white",
                                "border-2 border-zinc-900",
                                "rounded-xl shadow-[4px_4px_0px_0px] shadow-zinc-900",
                                "transition-all duration-300",
                                "group-hover:shadow-[8px_8px_0px_0px]",
                                "group-hover:translate-x-[-4px]",
                                "group-hover:translate-y-[-4px]"
                            )}
                        />

                        <div className="relative p-8">
                            {tier.popular && (
                                <div
                                    className="absolute -top-3 -right-3 bg-amber-400 text-zinc-900 
                                    px-4 py-1.5 rounded-full rotate-12 text-sm border-2 border-zinc-900 font-black shadow-sm"
                                >
                                    Popular!
                                </div>
                            )}

                            <div className="mb-8">
                                <div
                                    className={cn(
                                        "w-14 h-14 rounded-2xl mb-6",
                                        "flex items-center justify-center",
                                        "border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_0px] shadow-zinc-900"
                                    )}
                                    style={{ color: tier.color }}
                                >
                                    {tier.icon}
                                </div>
                                <h3 className="text-2xl text-zinc-900 font-bold tracking-tight">
                                    {tier.name}
                                </h3>
                                <p className="text-zinc-600 mt-2 line-height-relaxed">
                                    {tier.description}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="mb-8 flex items-baseline gap-1">
                                <span className="text-5xl font-black text-zinc-900 tracking-tighter">
                                    ${tier.price}
                                </span>
                                <span className="text-zinc-500 font-medium">
                                    /month
                                </span>
                            </div>

                            <div className="space-y-4 mb-10">
                                {tier.features.map((feature) => (
                                    <div
                                        key={feature}
                                        className="flex items-center gap-3"
                                    >
                                        <div
                                            className="w-5 h-5 rounded-full border-2 border-zinc-900 
                                            bg-white flex items-center justify-center shrink-0"
                                        >
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                        <span className="text-[1.05rem] text-zinc-800 font-medium leading-none">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className={cn(
                                    "w-full h-14 text-lg font-bold relative rounded-xl",
                                    "border-2 border-zinc-900",
                                    "transition-all duration-300",
                                    "shadow-[4px_4px_0px_0px] shadow-zinc-900",
                                    "hover:shadow-[6px_6px_0px_0px]",
                                    "hover:translate-x-[-2px] hover:translate-y-[-2px]",
                                    tier.popular
                                        ? [
                                              "bg-amber-400 text-zinc-900 hover:text-zinc-900 hover:bg-amber-300",
                                              "active:bg-amber-400",
                                          ]
                                        : [
                                              "bg-white text-zinc-900 hover:bg-zinc-50",
                                              "active:bg-zinc-100",
                                          ]
                                )}
                            >
                                Get Started
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Background elements */}
            <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none opacity-10">
                <div className="absolute top-40 left-20 text-4xl rotate-12">✎</div>
                <div className="absolute bottom-40 right-20 text-4xl -rotate-12">✏️</div>
            </div>
        </div>
    );
}

export { CreativePricing }
