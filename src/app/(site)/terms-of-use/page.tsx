import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شروط الاستخدام | البلاغ",
  description: "شروط استخدام موقع البلاغ — القواعد والأحكام التي تحكم استخدام الموقع ومحتواه",
};

export default function TermsOfUsePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-black mb-2" style={{ color: "#F0EAD6" }}>
        شروط الاستخدام
      </h1>
      <p className="text-sm mb-10" style={{ color: "#9A9070" }}>
        آخر تحديث: يونيو 2026
      </p>

      <div className="space-y-10 text-sm leading-loose" style={{ color: "#C8BFA0" }}>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>1. القبول بالشروط</h2>
          <p>
            باستخدامك لموقع <strong style={{ color: "#F0EAD6" }}>البلاغ</strong> (
            <span style={{ color: "#9A9070" }}>albaalaagh.com</span>) فأنت توافق على الالتزام
            بهذه الشروط والأحكام. إن كنت لا توافق على أي من هذه الشروط، يُرجى التوقف عن
            استخدام الموقع.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>2. وصف الخدمة</h2>
          <p>
            البلاغ منبر إعلامي تونسي مستقل يُقدّم محتوى إخبارياً وتحليلياً وحوارات سياسية
            وفكرية. يشمل الموقع أخباراً، ومقالات رأي، ومقابلات مصوّرة، وملفات موضوعية.
            المحتوى مُوجَّه للجمهور العربي عموماً والتونسي خصوصاً.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>3. الملكية الفكرية</h2>
          <p className="mb-3">
            جميع المحتويات المنشورة على الموقع — من نصوص وصور وفيديوهات وشعارات —
            هي ملك حصري لـ<strong style={{ color: "#F0EAD6" }}>البلاغ</strong> أو لأصحابها
            الأصليين المرخَّص لهم. يُحظر تماماً:
          </p>
          <ul className="list-disc list-inside space-y-2 pr-2">
            <li>نسخ المحتوى أو توزيعه دون إذن كتابي مسبق.</li>
            <li>إعادة نشر المقالات أو مقاطع الفيديو على مواقع أخرى دون نسب واضح.</li>
            <li>استخدام المحتوى لأغراض تجارية دون ترخيص.</li>
          </ul>
          <p className="mt-3">
            يُسمح بالاقتباس المحدود مع الإشارة الصريحة إلى المصدر ورابط الصفحة الأصلية.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>4. قواعد الاستخدام المقبول</h2>
          <p className="mb-3">يلتزم المستخدم بعدم:</p>
          <ul className="list-disc list-inside space-y-2 pr-2">
            <li>استخدام الموقع لأي غرض غير قانوني أو مُضلِّل.</li>
            <li>محاولة اختراق الموقع أو الأنظمة المرتبطة به.</li>
            <li>نشر أو إرسال محتوى مسيء أو تشهيري أو يُحرّض على الكراهية.</li>
            <li>انتحال صفة موظفي البلاغ أو تمثيل الموقع دون تفويض.</li>
            <li>استخدام برامج آلية لاستخراج البيانات (scraping) دون إذن مسبق.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>5. إخلاء المسؤولية</h2>
          <p className="mb-3">
            يسعى موقع البلاغ إلى دقة المعلومات المنشورة وموثوقيتها، غير أنه لا يضمن
            خلوّها من الأخطاء في جميع الأوقات. المحتوى مُقدَّم "كما هو" دون أي ضمان صريح
            أو ضمني.
          </p>
          <p>
            لا يتحمل الموقع المسؤولية عن أي ضرر مباشر أو غير مباشر ناتج عن الاعتماد على
            المعلومات المنشورة أو عن انقطاع الخدمة أو أي أعطال تقنية.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>6. روابط المواقع الخارجية</h2>
          <p>
            قد يتضمن الموقع روابط لمواقع خارجية لأغراض إعلامية. لا يتحمل البلاغ أي
            مسؤولية عن محتوى تلك المواقع أو سياساتها، وزيارتها تكون على مسؤوليتك الخاصة.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>7. التعليقات والمشاركة</h2>
          <p>
            في حال وجود أقسام للتفاعل أو التعليق، يتحمل المستخدم المسؤولية الكاملة عن
            المحتوى الذي يُرسله. يحتفظ البلاغ بالحق في حذف أي محتوى مخالف للقانون أو
            لقيم الموقع دون إشعار مسبق.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>8. الخدمات المدفوعة والدعم</h2>
          <p>
            في حال توفير أي خدمات مدفوعة مستقبلاً (كالاشتراكات أو الدعم المادي)، ستُطبَّق
            شروط إضافية خاصة بكل خدمة وتُنشر بوضوح عند إطلاقها.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>9. القانون الواجب التطبيق</h2>
          <p>
            تخضع هذه الشروط وتُفسَّر وفقاً للقوانين التونسية النافذة. أي نزاع ينشأ عن
            استخدام الموقع يخضع للاختصاص القضائي للمحاكم التونسية المختصة.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>10. التعديلات على الشروط</h2>
          <p>
            يحتفظ البلاغ بالحق في تعديل هذه الشروط في أي وقت. سيُشار إلى تاريخ آخر
            تحديث في أعلى الصفحة. استمرار استخدامك للموقع بعد نشر التعديلات يُعدّ قبولاً
            ضمنياً للشروط المحدّثة.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>11. التواصل معنا</h2>
          <p>
            لأي استفسار بشأن هذه الشروط، يمكنك التواصل معنا عبر{" "}
            <a href="/contact" style={{ color: "#C9A844", textDecoration: "underline" }}>
              صفحة الاتصال
            </a>
            {" "}أو عبر البريد الإلكتروني{" "}
            <a href="mailto:contact@albaalaagh.com" style={{ color: "#C9A844", textDecoration: "underline" }}>
              contact@albaalaagh.com
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  );
}
