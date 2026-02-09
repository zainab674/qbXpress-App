
import React from 'react';

interface LandingPageProps {
    onLogin: () => void;
    onGetStarted: () => void;
    onLaunchApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onGetStarted, onLaunchApp }) => {
    return (
        <div className="min-h-screen bg-[#f4f7f9] flex flex-col font-sans text-gray-800">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold tracking-tight text-gray-900">qbXpress </span>
                </div>
                <div className="flex items-center gap-6">
                    <a href="#features" className="text-sm font-medium hover:text-[#0077c5] transition-colors">Features</a>
                    <a href="#pricing" className="text-sm font-medium hover:text-[#0077c5] transition-colors">Pricing</a>
                    {localStorage.getItem('authToken') ? (
                        <button
                            onClick={onLaunchApp}
                            className="bg-[#16a34a] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#15803d] transition-all shadow-md"
                        >
                            Launch App
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onLogin}
                                className="text-sm font-bold text-[#0077c5] hover:underline"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={onGetStarted}
                                className="bg-[#0077c5] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#005fa3] transition-all shadow-md active:scale-95"
                            >
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <header className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center bg-gradient-to-b from-white to-[#eef4f8]">
                <div className="max-w-4xl">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a2b3c] leading-tight mb-6">
                        Run your entire business <br />
                        <span className="text-[#0077c5]">more efficiently.</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        A powerfull, fully integrated accounting and business management platform designed for modern growth. Everything you need, all in one place.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onGetStarted}
                            className="bg-[#0077c5] text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-[#005fa3] transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                            Start Free Trial
                        </button>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-white text-[#0077c5] border-2 border-[#0077c5] px-8 py-4 rounded-lg text-lg font-bold hover:bg-blue-50 transition-all active:scale-95"
                        >
                            Watch Demo
                        </button>
                    </div>
                    <p className="mt-6 text-sm text-gray-500 italic">No credit card required. 30-day free trial.</p>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-[#1a2b3c]">Everything you need to succeed</h2>
                        <div className="w-20 h-1 bg-[#0077c5] mx-auto mt-4"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                title: "Track Sales & Expenses",
                                desc: "Keep a pulse on your business. Easily create invoices, track sales, and manage your expenses in one place.",
                                icon: "💰"
                            },
                            {
                                title: "Manage Customers",
                                desc: "Full Customer Center to track interactions, balances, and contact info at a glance.",
                                icon: "👥"
                            },
                            {
                                title: "Insights & Reports",
                                desc: "Make informed decisions with powerful reporting. Profit & Loss, Balance Sheet, and more.",
                                icon: "📊"
                            }
                        ].map((f, i) => (
                            <div key={i} className="flex flex-col items-center text-center p-6 border border-gray-100 rounded-2xl hover:shadow-xl transition-shadow bg-gray-50/50">
                                <div className="text-4xl mb-6">{f.icon}</div>
                                <h3 className="text-xl font-bold mb-4 text-[#003366]">{f.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-gray-50 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-[#1a2b3c] mb-12">Choose the right plan for your business</h2>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold mb-2">Pro</h3>
                            <div className="text-4xl font-extrabold text-[#0077c5] mb-4">$299.95<span className="text-sm text-gray-500 font-normal"> /year</span></div>
                            <ul className="text-left space-y-3 mb-8 text-gray-600">
                                <li>✓ Up to 3 users</li>
                                <li>✓ Efficiently manage your business</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 bg-[#0077c5] text-white rounded-lg font-bold hover:bg-[#005fa3] transition-colors">Select Pro</button>
                        </div>
                        <div className="bg-white p-8 rounded-2xl border-2 border-[#0077c5] shadow-lg relative">
                            <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#0077c5] text-white px-3 py-1 rounded-full text-xs font-bold uppercase">Popular</div>
                            <h3 className="text-xl font-bold mb-2">Premier</h3>
                            <div className="text-4xl font-extrabold text-[#0077c5] mb-4">$499.95<span className="text-sm text-gray-500 font-normal"> /year</span></div>
                            <ul className="text-left space-y-3 mb-8 text-gray-600">
                                <li>✓ Up to 5 users</li>
                                <li>✓ Industry-specific features</li>
                                <li>✓ Everything in Pro, plus more</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 bg-[#0077c5] text-white rounded-lg font-bold hover:bg-[#005fa3] transition-colors">Select Premier</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#1a2b3c] text-white py-12 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 bg-[#0077c5] rounded flex items-center justify-center text-white font-bold text-xs">Q</div>
                            <span className="font-bold tracking-tight">qbXpress</span>
                        </div>

                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Product</h4>
                        <ul className="text-gray-400 text-sm space-y-2">
                            <li className="hover:text-white cursor-pointer transition-colors">Desktop Pro 2016</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Enterprise Solutions</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Payroll Services</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Support</h4>
                        <ul className="text-gray-400 text-sm space-y-2">
                            <li className="hover:text-white cursor-pointer transition-colors">Help Center</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Community</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Follow Us</h4>
                        <div className="flex gap-4 text-gray-400">
                            {/* Social icons placeholders */}
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#0077c5] cursor-pointer transition-colors">f</div>
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#0077c5] cursor-pointer transition-colors">t</div>
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#0077c5] cursor-pointer transition-colors">in</div>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-700 text-center text-gray-500 text-xs">
                    &copy; 2026 qbXpress Project. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
