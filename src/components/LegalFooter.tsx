export default function LegalFooter() {
  return (
    <footer className="bg-slate-800 text-white py-12 px-4 mt-auto">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">⚖️</span>
          <span className="text-xl font-bold">爱的延续</span>
        </div>
        <p className="text-slate-400 mb-6">
          专业律师团队 × AI辅助生成<br />
          让爱与财富安心传承
        </p>
        <p className="text-slate-500 text-sm mb-4">
          © 2024 爱的延续. 免责声明：本平台仅提供文书规划辅助服务，不构成法律意见。
        </p>
        <div className="border-t border-slate-700 pt-4 mt-4">
          <p className="text-slate-500 text-xs">
            本平台仅提供文书模板智能生成参考，不构成法律专业意见，所有文书仅供个人参考使用。
            如需法律咨询，请联系专业律师。
          </p>
        </div>
      </div>
    </footer>
  );
}
