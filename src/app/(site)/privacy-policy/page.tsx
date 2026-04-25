import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | البلاغ",
  description: "سياسة الخصوصية لموقع البلاغ — كيف نجمع بياناتك ونستخدمها ونحميها",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1
        className="text-3xl font-black mb-2"
        style={{ color: "#F0EAD6" }}
      >
        سياسة الخصوصية
      </h1>
      <p className="text-sm mb-10" style={{ color: "#9A9070" }}>
        آخر تحديث: أبريل 2026
      </p>

      <div className="space-y-10 text-sm leading-loose" style={{ color: "#C8BFA0" }}>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>1. مقدمة</h2>
          <p>
            يلتزم موقع <strong style={{ color: "#F0EAD6" }}>البلاغ</strong> (
            <span style={{ color: "#9A9070" }}>albaalaagh.com</span>) بحماية خصوصية زواره.
            تُوضّح هذه السياسة أنواع المعلومات التي نجمعها، وكيفية استخدامها،
            والخيارات المتاحة لك بشأنها. باستخدامك للموقع فأنت توافق على الشروط الواردة أدناه.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>2. المعلومات التي نجمعها</h2>
          <ul className="list-disc list-inside space-y-2 pr-2">
            <li>
              <strong style={{ color: "#F0EAD6" }}>بيانات الاستخدام تلقائياً:</strong> عند زيارتك للموقع
              قد يسجّل الخادم عنوان IP الخاص بك، ونوع المتصفح، والصفحات التي زرتها،
              ووقت الزيارة، وذلك لأغراض تشغيلية وأمنية فقط.
            </li>
            <li>
              <strong style={{ color: "#F0EAD6" }}>ملفات الارتباط (Cookies):</strong> يستخدم الموقع
              ملفات ارتباط ضرورية لضمان الأداء الصحيح، إضافةً إلى ملفات ارتباط طرف ثالث مرتبطة
              بخدمات الإعلانات والتحليل الموضّحة أدناه.
            </li>
            <li>
              <strong style={{ color: "#F0EAD6" }}>بيانات تطوعية:</strong> إن تواصلت معنا عبر صفحة
              الاتصال، نحتفظ بالمعلومات التي تُرسلها (الاسم، البريد الإلكتروني، الرسالة) بغرض
              الرد عليك حصراً.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>3. الإعلانات — Google AdSense</h2>
          <p className="mb-3">
            يستخدم الموقع <strong style={{ color: "#F0EAD6" }}>Google AdSense</strong> لعرض الإعلانات.
            قد تستخدم Google ملفات الارتباط لعرض إعلانات مبنية على زياراتك السابقة لهذا الموقع
            ومواقع أخرى على الإنترنت.
          </p>
          <p className="mb-3">
            يمكنك إلغاء تفعيل الإعلانات المخصصة عبر{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#C9A844", textDecoration: "underline" }}
            >
              إعدادات إعلانات Google
            </a>
            ، أو عبر{" "}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#C9A844", textDecoration: "underline" }}
            >
              aboutads.info
            </a>
            .
          </p>
          <p>
            لمزيد من المعلومات حول كيفية استخدام Google للبيانات، يرجى الاطلاع على{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#C9A844", textDecoration: "underline" }}
            >
              سياسة خصوصية Google
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>4. تحليلات الموقع</h2>
          <p>
            قد نستخدم أدوات تحليل مجهولة الهوية لفهم كيفية تفاعل الزوار مع المحتوى وتحسين
            تجربة المستخدم. لا تُشارَك هذه البيانات مع أطراف ثالثة لأغراض تجارية.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>5. مشاركة البيانات</h2>
          <p>
            لا نبيع بياناتك الشخصية ولا نؤجّرها لأي طرف ثالث. قد نُفصح عن المعلومات
            حصراً في الحالات التالية:
          </p>
          <ul className="list-disc list-inside space-y-2 pr-2 mt-2">
            <li>الامتثال لمتطلبات قانونية أو أوامر قضائية.</li>
            <li>حماية حقوق الموقع أو سلامة المستخدمين في حالات الطوارئ.</li>
            <li>مزودو الخدمات التقنية (استضافة، قواعد بيانات) الملتزمون بسرية البيانات.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>6. روابط المواقع الخارجية</h2>
          <p>
            قد يحتوي الموقع على روابط لمواقع خارجية. لسنا مسؤولين عن سياسات الخصوصية
            الخاصة بتلك المواقع، وننصحك بمراجعتها بشكل مستقل.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>7. أمن البيانات</h2>
          <p>
            نتخذ تدابير تقنية وتنظيمية معقولة لحماية البيانات من الوصول غير المصرح به
            أو الإفصاح أو التعديل. غير أن لا نظام إلكتروني يُضمن أمانه الكامل.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>8. حقوقك</h2>
          <p>يحق لك في أي وقت:</p>
          <ul className="list-disc list-inside space-y-2 pr-2 mt-2">
            <li>طلب الاطلاع على البيانات التي نحتفظ بها عنك.</li>
            <li>طلب تصحيح أو حذف بياناتك الشخصية.</li>
            <li>الاعتراض على معالجة بياناتك لأغراض التسويق.</li>
          </ul>
          <p className="mt-3">
            لممارسة هذه الحقوق، تواصل معنا عبر{" "}
            <a href="/contact" style={{ color: "#C9A844", textDecoration: "underline" }}>
              صفحة الاتصال
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>9. خصوصية الأطفال</h2>
          <p>
            لا يستهدف موقع البلاغ الأطفال دون سن 13 عاماً، ولا نجمع بيانات شخصية
            متعلقة بهم بشكل متعمد.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>10. التعديلات على هذه السياسة</h2>
          <p>
            نحتفظ بالحق في تعديل هذه السياسة في أي وقت. سيُشار إلى تاريخ آخر تحديث
            في أعلى الصفحة. استمرار استخدامك للموقع بعد التعديل يُعدّ قبولاً للسياسة المحدّثة.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-3" style={{ color: "#C9A844" }}>11. التواصل معنا</h2>
          <p>
            لأي استفسار بشأن هذه السياسة، يمكنك التواصل معنا عبر{" "}
            <a href="/contact" style={{ color: "#C9A844", textDecoration: "underline" }}>
              صفحة الاتصال
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  );
}
