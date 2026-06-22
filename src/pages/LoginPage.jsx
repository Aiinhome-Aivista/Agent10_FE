import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../store/slices/authSlice";
import api from "../services/api";
import { 
  ArrowLeft, Check, Search, MapPin, Calendar, 
  Users, Activity, User, Info, Shield, 
  AlertCircle, ChevronRight, Phone, Mail 
} from "lucide-react";

const popularCities = [
  "Kolkata",
  "North 24 Parganas",
  "South 24 Parganas",
  "Howrah",
  "Hooghly",
  "Nadia",
  "Bardhaman",
  "Midnapore East",
  "Midnapore West",
  "Murshidabad"
];

const allCities = [
  "Kolkata", "Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad", "Pune", 
  "North 24 Parganas", "South 24 Parganas", "Howrah", "Hooghly", "Nadia", 
  "Bardhaman", "Midnapore East", "Midnapore West", "Murshidabad", 
  "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Kanpur", "Patna", "Ranchi"
];

function InsurerLogo({ code, name }) {
  let logoBg = "linear-gradient(135deg, #1e293b, #0f172a)";
  let logoText = "INS";
  let textColor = "#fff";
  const upperCode = (code || "").toUpperCase();

  if (upperCode.includes("ADITYA") || upperCode.includes("ACTIV")) {
    logoBg = "linear-gradient(135deg, #e11d48, #9f1239)";
    logoText = "Aditya Birla";
  } else if (upperCode.includes("NIVA") || upperCode.includes("BUPA")) {
    logoBg = "linear-gradient(135deg, #0284c7, #075985)";
    logoText = "niva bupa";
  } else if (upperCode.includes("CARE")) {
    logoBg = "linear-gradient(135deg, #eab308, #ca8a04)";
    logoText = "care";
    textColor = "#0f172a";
  } else if (upperCode.includes("HDFC")) {
    logoBg = "linear-gradient(135deg, #1d4ed8, #1e3a8a)";
    logoText = "HDFC ergo";
  } else if (upperCode.includes("SBI")) {
    logoBg = "linear-gradient(135deg, #0891b2, #155e75)";
    logoText = "SBI General";
  } else if (upperCode.includes("ICICI")) {
    logoBg = "linear-gradient(135deg, #ea580c, #9a3412)";
    logoText = "ICICI Lombard";
  } else {
    logoText = name || "Insurer";
  }

  return (
    <div style={{
      background: logoBg,
      color: textColor,
      padding: "16px 20px",
      borderRadius: 12,
      fontWeight: 800,
      fontSize: 14,
      textAlign: "center",
      minWidth: 120,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      fontFamily: "'Syne', sans-serif"
    }}>
      {logoText}
    </div>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: authLoading, error: authError } = useSelector((s) => s.auth);

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Flow State
  const [flow, setFlow] = useState("login"); // "login", "wizard", "results"
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard input states
  const [gender, setGender] = useState("Male");
  const [selectedMembers, setSelectedMembers] = useState(["Self"]);
  const [moreMembersExpanded, setMoreMembersExpanded] = useState(false);
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  
  // Modal (Step 4) Input States
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [emailAddress, setEmailAddress] = useState("");
  const [modalError, setModalError] = useState("");

  // Step 5 Medical States
  const [medicalConditions, setMedicalConditions] = useState(["None of These"]);
  const [customDisease, setCustomDisease] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // Quote Result States
  const [quotes, setQuotes] = useState([]);
  const [fetchingPlans, setFetchingPlans] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [coverAmounts, setCoverAmounts] = useState({}); // { [quoteId]: "2500000" }
  const [comparisonList, setComparisonList] = useState([]); // Array of quote IDs

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(loginUser({ email, password }));
    if (res.meta.requestStatus === "fulfilled") {
      const mustReset = res.payload?.user?.must_change_password;
      if (mustReset) navigate('/reset-password');
      else navigate("/dashboard");
    }
  };

  const handleGenderChange = (selectedGender) => {
    setGender(selectedGender);
    setSelectedMembers(prev => prev.map(m => {
      if (m === "Wife" && selectedGender === "Female") return "Husband";
      if (m === "Husband" && selectedGender === "Male") return "Wife";
      return m;
    }));
  };

  const toggleMember = (member) => {
    setSelectedMembers(prev => {
      if (prev.includes(member)) {
        return prev.filter(m => m !== member);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleCitySelect = (selectedCity) => {
    setCity(selectedCity);
    setCitySearch(selectedCity);
    setShowCitySuggestions(false);
  };

  const toggleCondition = (cond) => {
    setMedicalConditions(prev => {
      if (cond === "None of These") {
        return ["None of These"];
      }
      const next = prev.filter(c => c !== "None of These");
      if (next.includes(cond)) {
        const filtered = next.filter(c => c !== cond);
        return filtered.length === 0 ? ["None of These"] : filtered;
      } else {
        return [...next, cond];
      }
    });
  };

  const handleStep3Next = () => {
    if (!city) {
      return;
    }
    // Show Unlock Modal as Step 4 (80% progress)
    setShowUnlockModal(true);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    setModalError("");

    if (!fullName.trim() || fullName.trim().length < 3 || !/^[a-zA-Z\s]+$/.test(fullName)) {
      setModalError("Please enter a valid full name (alphabets only, min 3 characters).");
      return;
    }

    if (countryCode === "+91" && (!/^\d{10}$/.test(mobileNumber.trim()))) {
      setModalError("Please enter a valid 10-digit Indian mobile number.");
      return;
    } else if (mobileNumber.trim().length < 7) {
      setModalError("Please enter a valid mobile number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
      setModalError("Please enter a valid email address.");
      return;
    }

    // Modal fields valid: Close modal and progress to Step 5 (Medical History)
    setShowUnlockModal(false);
    setWizardStep(5);
  };

  const handleFetchPlans = async () => {
    setFetchingPlans(true);
    setFetchError(null);
    try {
      const payload = {
        gender,
        selectedMembers,
        age: parseInt(age) || 30,
        city,
        fullName,
        mobileNumber: `${countryCode} ${mobileNumber}`,
        email: emailAddress,
        medicalHistory: medicalConditions,
        customDisease: medicalConditions.includes("Other Disease") ? customDisease : null,
        whatsappConsent
      };

      const response = await api.post("/quotes/public", payload);
      const quotesList = response.data.quotes || [];
      setQuotes(quotesList);
      
      // Initialize cover amounts default to 25 Lakh
      const initialCovers = {};
      quotesList.forEach(q => {
        initialCovers[q.id] = "2500000";
      });
      setCoverAmounts(initialCovers);

      setFlow("results");
    } catch (e) {
      setFetchError(e.response?.data?.detail || "Failed to fetch quotes. Please make sure the backend server is running and try again.");
    } finally {
      setFetchingPlans(false);
    }
  };

  const calculatePremium = (basePremium, currentCover) => {
    const cover = parseInt(currentCover) || 2500000;
    const ratio = cover / 2500000;
    const scale = Math.pow(ratio, 0.55); // realistic logarithmic premium scaling
    return Math.round(basePremium * scale);
  };

  const toggleCompare = (quoteId) => {
    setComparisonList(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 plans at a time.");
          return prev;
        }
        return [...prev, quoteId];
      }
    });
  };

  // Predefined members based on gender
  const genderMembers = gender === "Male" 
    ? ["Self", "Wife", "Son", "Daughter", "Father", "Mother"]
    : ["Self", "Husband", "Son", "Daughter", "Father", "Mother"];

  const moreMembers = ["Father-in-law", "Mother-in-law", "Brother", "Sister", "Grandfather", "Grandmother"];

  const filteredCities = citySearch
    ? allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    : [];

  // Determine current wizard progress percentage
  const getProgressPercentage = () => {
    if (showUnlockModal) return 80;
    return wizardStep * 20;
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: flow === "results" ? 30 : 40, 
        width: "100%", maxWidth: flow === "results" ? 900 : flow === "wizard" ? 600 : 400,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        transition: "max-width 0.4s ease, padding 0.4s ease"
      }}>
        
        {/* FLOW 1: SIGN IN */}
        {flow === "login" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 16, margin: "0 auto 12px",
              }}>Q2P</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Welcome back</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {authError && (
                <div style={{ background: "#ef444415", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  {authError}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 14, outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Password</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 40px 10px 12px", color: "var(--text)", fontSize: 14, outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 12, background: "none", border: "none",
                      cursor: "pointer", color: "var(--text-muted)", display: "flex",
                      alignItems: "center", justifyContent: "center", padding: 0,
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.498 7.978 7.89 4.5 12 4.5c4.19 0 8.581 3.5 9.963 7.178.07.186.07.392 0 .578-1.38 3.678-5.772 7.178-9.963 7.178-4.19 0-8.581-3.5-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={authLoading}
                style={{
                  background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
                  padding: "12px", fontWeight: 700, fontSize: 14, cursor: authLoading ? "not-allowed" : "pointer",
                  opacity: authLoading ? 0.7 : 1, marginTop: 4,
                }}
              >
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", margin: "24px 0 16px", gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Quick Login</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div
                onClick={() => {
                  setEmail("sanjib2119@gmail.com");
                  setPassword("password123");
                }}
                style={{
                  background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "10px 6px", textAlign: "center", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "var(--surface-alt)";
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Banker</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>sanjib2119</div>
              </div>

              <div
                onClick={() => {
                  setFlow("wizard");
                  setWizardStep(1);
                  setSelectedMembers(["Self"]);
                  setGender("Male");
                  setAge("");
                  setCity("");
                  setCitySearch("");
                  setMedicalConditions(["None of These"]);
                  setCustomDisease("");
                }}
                style={{
                  background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "10px 6px", textAlign: "center", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "var(--surface-alt)";
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Customer</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>Quotes Quiz</div>
              </div>

              <div
                onClick={() => {
                  setEmail("arjunmehta@q2p.com");
                  setPassword("Underwriter@123");
                }}
                style={{
                  background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "10px 6px", textAlign: "center", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "var(--surface-alt)";
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Underwriter</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>arjunmehta</div>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 24 }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Register</Link>
            </p>
          </div>
        )}

        {/* FLOW 2: MULTI-STEP WIZARD */}
        {flow === "wizard" && (
          <div>
            {/* Top Progress Bar & Percentage indicator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Step {wizardStep} of 5
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                {getProgressPercentage()}% Complete
              </span>
            </div>

            {/* Smooth Progress Bar Container */}
            <div style={{ width: "100%", background: "var(--border)", height: 6, borderRadius: 3, marginBottom: 28, overflow: "hidden" }}>
              <div style={{
                width: `${getProgressPercentage()}%`,
                background: "var(--accent)",
                height: "100%",
                borderRadius: 3,
                transition: "width 0.3s ease-in-out"
              }}></div>
            </div>

            {/* Step 1: Gender & Member Selection */}
            {wizardStep === 1 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Gender & Family Members</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>Select primary gender and choose the family members you wish to include in your policy cover.</p>

                {/* Gender Toggle */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Gender</label>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["Male", "Female"].map(g => (
                      <button
                        key={g} type="button" onClick={() => handleGenderChange(g)}
                        style={{
                          flex: 1, padding: "12px", background: gender === g ? "var(--accent)" : "var(--surface-alt)",
                          border: gender === g ? "1px solid var(--accent)" : "1px solid var(--border)",
                          color: "#fff", borderRadius: 8, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Family Members Grid */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Family Members</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {genderMembers.map(m => {
                      const isSelected = selectedMembers.includes(m);
                      return (
                        <div
                          key={m} onClick={() => toggleMember(m)}
                          style={{
                            padding: "12px", background: isSelected ? "rgba(99, 102, 241, 0.1)" : "var(--surface-alt)",
                            border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                            borderRadius: 8, textAlign: "center", cursor: "pointer", color: isSelected ? "#fff" : "var(--text-muted)",
                            fontWeight: 600, fontSize: 13, transition: "all 0.2s"
                          }}
                        >
                          {m}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* More Members Expandable */}
                <div style={{ marginBottom: 24 }}>
                  <button
                    type="button" onClick={() => setMoreMembersExpanded(!moreMembersExpanded)}
                    style={{
                      background: "none", border: "none", color: "var(--accent)", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: 0
                    }}
                  >
                    {moreMembersExpanded ? "▼ Hide Additional Members" : "▶ Add More Members (Parents-in-law, Brother, etc.)"}
                  </button>

                  {moreMembersExpanded && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 12 }}>
                      {moreMembers.map(m => {
                        const isSelected = selectedMembers.includes(m);
                        return (
                          <div
                            key={m} onClick={() => toggleMember(m)}
                            style={{
                              padding: "12px", background: isSelected ? "rgba(99, 102, 241, 0.1)" : "var(--surface-alt)",
                              border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                              borderRadius: 8, textAlign: "center", cursor: "pointer", color: isSelected ? "#fff" : "var(--text-muted)",
                              fontWeight: 600, fontSize: 13, transition: "all 0.2s"
                            }}
                          >
                            {m}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedMembers.length === 0 && (
                  <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} /> At least one family member must be selected.
                  </div>
                )}

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <button
                    type="button" onClick={() => setFlow("login")}
                    style={{
                      background: "none", border: "1px solid var(--border)", color: "var(--text)",
                      borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    Back to Login
                  </button>
                  <button
                    type="button" onClick={() => setWizardStep(2)}
                    disabled={selectedMembers.length === 0}
                    style={{
                      background: "var(--accent)", color: "#fff", border: "none",
                      borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                      cursor: selectedMembers.length === 0 ? "not-allowed" : "pointer",
                      opacity: selectedMembers.length === 0 ? 0.6 : 1
                    }}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Age Selection */}
            {wizardStep === 2 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Select Your Age</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>Please select your age. Standard pricing calculators require age verification to calculate medical rates.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Age of Primary Insured</label>
                  <select
                    value={age} onChange={(e) => setAge(e.target.value)}
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "14px 12px", color: "var(--text)", fontSize: 15, outline: "none"
                    }}
                  >
                    <option value="">Select Age</option>
                    {Array.from({ length: 83 }, (_, i) => 18 + i).map(val => (
                      <option key={val} value={val}>{val} Years</option>
                    ))}
                  </select>
                </div>

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <button
                    type="button" onClick={() => setWizardStep(1)}
                    style={{
                      background: "none", border: "1px solid var(--border)", color: "var(--text)",
                      borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button" onClick={() => setWizardStep(3)}
                    disabled={!age}
                    style={{
                      background: "var(--accent)", color: "#fff", border: "none",
                      borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                      cursor: !age ? "not-allowed" : "pointer", opacity: !age ? 0.6 : 1
                    }}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: City Selection */}
            {wizardStep === 3 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Select Your City</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>We filter policy results by available cashless hospital networks in your locality.</p>

                {/* Search Box */}
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Search City</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="text" value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setCity(e.target.value);
                        setShowCitySuggestions(true);
                      }}
                      onFocus={() => setShowCitySuggestions(true)}
                      placeholder="Type your city name (e.g. Kolkata)"
                      style={{
                        width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "12px 12px 12px 40px", color: "var(--text)", fontSize: 14, outline: "none"
                      }}
                    />
                    <Search size={16} style={{ position: "absolute", left: 14, color: "var(--text-muted)" }} />
                  </div>

                  {/* Dropdown matching suggestions */}
                  {showCitySuggestions && citySearch && filteredCities.length > 0 && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                      background: "var(--surface-alt)", border: "1px solid var(--border)",
                      borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                    }}>
                      {filteredCities.map(c => (
                        <div
                          key={c} onClick={() => handleCitySelect(c)}
                          style={{
                            padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                            fontSize: 13, color: "var(--text)", transition: "background 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--border)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Cities Chips */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Popular Locations</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {popularCities.map(c => {
                      const isSelected = city === c;
                      return (
                        <button
                          key={c} type="button" onClick={() => handleCitySelect(c)}
                          style={{
                            padding: "6px 12px", background: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--surface-alt)",
                            border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                            color: isSelected ? "#fff" : "var(--text-muted)", borderRadius: 16,
                            fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                          }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <button
                    type="button" onClick={() => setWizardStep(2)}
                    style={{
                      background: "none", border: "1px solid var(--border)", color: "var(--text)",
                      borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button" onClick={handleStep3Next}
                    disabled={!city}
                    style={{
                      background: "var(--accent)", color: "#fff", border: "none",
                      borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                      cursor: !city ? "not-allowed" : "pointer", opacity: !city ? 0.6 : 1
                    }}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Medical History */}
            {wizardStep === 5 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Medical History</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>Do any selected members have existing illnesses or take regular medication?</p>

                {/* Choices Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
                  {["Diabetes", "Blood Pressure", "Heart Disease", "Thyroid", "Asthma", "Any Surgery", "Other Disease", "None of These"].map(cond => {
                    const isSelected = medicalConditions.includes(cond);
                    return (
                      <div
                        key={cond} onClick={() => toggleCondition(cond)}
                        style={{
                          padding: "12px", background: isSelected ? "rgba(99, 102, 241, 0.1)" : "var(--surface-alt)",
                          border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: 8, textAlign: "center", cursor: "pointer", color: isSelected ? "#fff" : "var(--text-muted)",
                          fontWeight: 600, fontSize: 13, transition: "all 0.2s"
                        }}
                      >
                        {cond}
                      </div>
                    );
                  })}
                </div>

                {/* Conditional Other Disease Input */}
                {medicalConditions.includes("Other Disease") && (
                  <div style={{ marginBottom: 20, animation: "fadeIn 0.2s ease" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Specify Medical Condition</label>
                    <input
                      type="text" value={customDisease} onChange={(e) => setCustomDisease(e.target.value)}
                      placeholder="Please specify your medical condition (e.g. Arthritis)"
                      style={{
                        width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 14, outline: "none"
                      }}
                    />
                  </div>
                )}

                {/* Whatsapp Consent Checkbox */}
                <div style={{ margin: "24px 0" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text-muted)", lineHeight: "1.4" }}>
                    <input
                      type="checkbox" checked={whatsappConsent} onChange={(e) => setWhatsappConsent(e.target.checked)}
                      style={{ marginTop: 3, accentColor: "var(--accent)" }}
                    />
                    <span>Receive policy quotes, benefit analysis and updates on WhatsApp directly.</span>
                  </label>
                </div>

                {fetchError && (
                  <div style={{ background: "#ef444415", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                    {fetchError}
                  </div>
                )}

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <button
                    type="button" onClick={() => setWizardStep(3)}
                    style={{
                      background: "none", border: "1px solid var(--border)", color: "var(--text)",
                      borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button" onClick={handleFetchPlans} disabled={fetchingPlans}
                    style={{
                      background: "var(--teal)", color: "#000", border: "none",
                      borderRadius: 8, padding: "12px 28px", fontSize: 13, fontWeight: 800,
                      cursor: fetchingPlans ? "not-allowed" : "pointer"
                    }}
                  >
                    {fetchingPlans ? "Fetching plans..." : "View Plans"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FLOW 3: QUOTE RESULTS PAGE */}
        {flow === "results" && (
          <div>
            {/* Header section with quote metadata */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", pb: 16, marginBottom: 24, paddingBottom: 16 }}>
              <div>
                <button
                  type="button" onClick={() => { setFlow("wizard"); setWizardStep(5); }}
                  style={{
                    background: "none", border: "none", color: "var(--accent)", cursor: "pointer",
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 8
                  }}
                >
                  <ArrowLeft size={14} /> Back to Edit Details
                </button>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>Insurance Quotes For You</h1>
                <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
                  Showing eligible plans for {fullName} ({age} Y, {gender}) • {city}
                </p>
              </div>

              {comparisonList.length > 0 && (
                <div style={{
                  background: "rgba(99, 102, 241, 0.1)", border: "1px solid var(--accent)",
                  borderRadius: 12, padding: "10px 16px", textAlign: "right"
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#fff" }}>
                    {comparisonList.length} Plans Selected
                  </p>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Compare benefits side-by-side</span>
                </div>
              )}
            </div>

            {/* List of Quotes (PolicyBazaar Style Card) */}
            {quotes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Activity size={48} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No plans found</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                  No indexed brochures matching your filters were found in the knowledgebase. Please upload policy documents or broaden search criteria.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {quotes.map(q => {
                  const selectedCover = coverAmounts[q.id] || "2500000";
                  const premium = calculatePremium(q.annual_premium, selectedCover);
                  const isComparing = comparisonList.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      style={{
                        background: "var(--surface-alt)", border: isComparing ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: 16, padding: "24px 30px", display: "grid", gridTemplateColumns: "1fr",
                        gap: 24, position: "relative", transition: "all 0.3s"
                      }}
                    >
                      {/* Responsive columns layout grid (desktop double-column, mobile stack) */}
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1fr) 2fr 1.5fr", gap: 24 }}>
                        
                        {/* Logo and branding info */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)", paddingRight: 24 }}>
                          <InsurerLogo code={q.insurer_code} name={q.insurer_name} />
                          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <Info size={12} /> About Insurer
                          </span>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
                            <input
                              type="checkbox" checked={isComparing} onChange={() => toggleCompare(q.id)}
                              style={{ accentColor: "var(--accent)" }}
                            />
                            <span>Add to Compare</span>
                          </label>
                        </div>

                        {/* Middle panel: Benefits bullets */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>
                              {q.product_name || "Standard Protection Plan"}
                            </h3>
                            {q.ai_rank === 1 && (
                              <span style={{ background: "rgba(45, 212, 191, 0.15)", color: "var(--teal)", fontSize: 10, px: 2, padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                                Top Plan
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text)" }}>
                              <span style={{ color: "var(--teal)", fontWeight: "bold" }}>✔</span>
                              <span>
                                <strong>{q.coverage_details?.cashless_hospitals || "100+ Cashless hospitals"}</strong>.{" "}
                                <span style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>View list</span>
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text)" }}>
                              <span style={{ color: "var(--teal)", fontWeight: "bold" }}>✔</span>
                              <span>Waiting Period: {q.coverage_details?.waiting_period_desc || "3 years for pre-existing diseases"}</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text)" }}>
                              <span style={{ color: "var(--teal)", fontWeight: "bold" }}>✔</span>
                              <span>Room Rent Limit: {q.coverage_details?.room_rent_limit || "No Room Rent Limit"}</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text)" }}>
                              <span style={{ color: "var(--teal)", fontWeight: "bold" }}>✔</span>
                              <span>Restoration: {q.coverage_details?.restoration_benefit || "100% Restoration benefit"}</span>
                            </div>
                          </div>

                          {/* Recommendation explanation from LLM */}
                          {q.ai_recommendation_text && (
                            <p style={{ margin: "14px 0 0", borderTop: "1px dashed var(--border)", paddingTop: 10, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                              {q.ai_recommendation_text}
                            </p>
                          )}
                        </div>

                        {/* Right panel: Quote pricing controls */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
                          <div style={{ width: "100%" }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4, textAlign: "right" }}>Cover Amount</label>
                            <select
                              value={selectedCover}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCoverAmounts(prev => ({ ...prev, [q.id]: val }));
                              }}
                              style={{
                                width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                                borderRadius: 6, padding: "6px 8px", color: "var(--text)", fontSize: 13, outline: "none",
                                fontWeight: 600, textAlign: "right"
                              }}
                            >
                              <option value="1000000">₹10 Lakh</option>
                              <option value="2500000">₹25 Lakh</option>
                              <option value="5000000">₹50 Lakh</option>
                              <option value="10000000">₹1 Crore</option>
                            </select>
                          </div>

                          <div style={{ textAlign: "right", marginTop: 14 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Premium (1 Year)</span>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", margin: "2px 0 0" }}>
                              ₹{premium.toLocaleString()}
                            </p>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>inclusive of GST</span>
                          </div>

                          <button
                            type="button"
                            style={{
                              background: "#ff5a36", color: "#fff", border: "none",
                              borderRadius: 8, padding: "10px 16px", fontWeight: 700,
                              fontSize: 13, marginTop: 12, cursor: "pointer", width: "100%"
                            }}
                          >
                            Customize plan ›
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* STEP 4: MODAL POPUP OVERLAY */}
      {showUnlockModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(10, 11, 16, 0.85)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 440,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            animation: "fadeIn 0.25s ease-out"
          }}>
            {/* Top Close indicator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Verification Step
              </span>
              <button
                type="button" onClick={() => setShowUnlockModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 0 }}
              >
                &times;
              </button>
            </div>

            <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Unlock Personalized Plans</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "0 0 20px", lineHeight: "1.4" }}>
              We use your details only to verify eligibility and query insurance rules.
            </p>

            <form onSubmit={handleModalSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {modalError && (
                <div style={{ background: "#ef444415", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} /> {modalError}
                </div>
              )}

              {/* Full Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Full Name</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                    placeholder="Enter your name"
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "10px 12px 10px 36px", color: "var(--text)", fontSize: 14, outline: "none"
                    }}
                  />
                  <User size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                </div>
              </div>

              {/* Mobile Number with Country Code */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Mobile Number</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "10px 6px", color: "var(--text)", fontSize: 13, outline: "none"
                    }}
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+971">+971 (AE)</option>
                  </select>
                  <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                    <input
                      type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required
                      placeholder="10-digit number"
                      style={{
                        width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "10px 12px 10px 36px", color: "var(--text)", fontSize: 14, outline: "none"
                      }}
                    />
                    <Phone size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Email Address</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required
                    placeholder="yourname@gmail.com"
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "10px 12px 10px 36px", color: "var(--text)", fontSize: 14, outline: "none"
                    }}
                  />
                  <Mail size={15} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  type="button" onClick={() => setShowUnlockModal(false)}
                  style={{
                    flex: 1, background: "none", border: "1px solid var(--border)", color: "var(--text)",
                    borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
