export default function Footer() {
  return (
    <footer className="w-full px-4 py-6 text-center">
      <div className="max-w-2xl mx-auto mb-6">
        <div
          className="bg-[#34495e] px-5 py-4 rounded-lg text-left"
          style={{ backgroundColor: '#34495e' }}
        >
          <p className="text-white text-sm leading-relaxed" style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
            <strong>法律免责声明</strong><br />
            本平台仅提供文书模板智能生成参考服务，不构成任何法律专业意见。所有生成的文书仅供个人参考使用，不具有律师函或法律咨询的效力。如需具有法律效力的文书或专业法律建议，请咨询具有相应资质的律师或法律服务机构。因使用本平台生成文书导致的任何直接或间接损失，我们不承担任何法律责任。
          </p>
        </div>
      </div>
      <p className="text-gray-400 text-xs">
        &copy; 2026 AI Will Planner. All rights reserved.
      </p>
      <p className="text-gray-400 text-xs mt-2">
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noopener nofollow"
          className="hover:text-red-500"
        >
          沪ICP备2026020925号-1
        </a>
        <span className="mx-1">|</span>
        爱的延续工作室 · 上海市
      </p>
    </footer>
  )
}
