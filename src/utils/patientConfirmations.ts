// Short, patient-facing audio confirmation played after a history is
// submitted, per the "bilingual output" requirement (physician-facing
// summary in English/Hindi; patient-facing audio confirmation in local
// language). These are best-effort translations — have a native speaker
// review before production use.
export const PATIENT_CONFIRMATION: Record<string, string> = {
  en: "Your health information has been recorded and sent to the doctor. Please go to the waiting area.",
  hi: "आपकी स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर के पास भेज दी गई है। कृपया प्रतीक्षा कक्ष में जाएं।",
  ta: "உங்கள் சுகாதாரத் தகவல் பதிவு செய்யப்பட்டு மருத்துவரிடம் அனுப்பப்பட்டுள்ளது. தயவுசெய்து காத்திருப்பு அறைக்குச் செல்லவும்.",
  te: "మీ ఆరోగ్య సమాచారం నమోదు చేయబడి వైద్యుడికి పంపబడింది. దయచేసి వెయిటింగ్ ఏరియాకు వెళ్లండి.",
  bn: "আপনার স্বাস্থ্য তথ্য রেকর্ড করা হয়েছে এবং ডাক্তারের কাছে পাঠানো হয়েছে। অনুগ্রহ করে অপেক্ষার জায়গায় যান।",
  mr: "तुमची आरोग्य माहिती नोंदवली गेली असून डॉक्टरांकडे पाठवली आहे. कृपया प्रतीक्षा कक्षात जा.",
  pa: "ਤੁਹਾਡੀ ਸਿਹਤ ਜਾਣਕਾਰੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ ਅਤੇ ਡਾਕਟਰ ਕੋਲ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਖੇਤਰ ਵਿੱਚ ਜਾਓ।",
  kn: "ನಿಮ್ಮ ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ದಾಖಲಿಸಿ ವೈದ್ಯರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಕಾಯುವ ಕೊಠಡಿಗೆ ತೆರಳಿ.",
  ml: "നിങ്ങളുടെ ആരോഗ്യ വിവരങ്ങൾ രേഖപ്പെടുത്തി ഡോക്ടർക്ക് അയച്ചിട്ടുണ്ട്. ദയവായി കാത്തിരിപ്പ് സ്ഥലത്തേക്ക് പോകുക.",
  gu: "તમારી આરોગ્ય માહિતી નોંધવામાં આવી છે અને ડૉક્ટરને મોકલવામાં આવી છે. કૃપા કરીને પ્રતીક્ષા ખંડમાં જાઓ.",
  od: "ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା ରେକର୍ଡ ହୋଇ ଡାକ୍ତରଙ୍କ ନିକଟକୁ ପଠାଯାଇଛି। ଦୟାକରି ଅପେକ୍ଷା କକ୍ଷକୁ ଯାଆନ୍ତୁ।",
  ur: "آپ کی صحت کی معلومات درج کر لی گئی ہیں اور ڈاکٹر کو بھیج دی گئی ہیں۔ براہ کرم انتظار گاہ میں جائیں۔",
};

export function getPatientConfirmation(languageCode: string | undefined): string {
  return PATIENT_CONFIRMATION[languageCode || "en"] || PATIENT_CONFIRMATION.en;
}
