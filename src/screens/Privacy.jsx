// 隐私说明页：面向家长和平台的合规说明

export default function Privacy({ onBack }) {
  return (
    <div className="privacy-page panel pop-in">
      <h2 className="privacy-page__title">🔒 隐私说明</h2>

      <section className="privacy-page__section">
        <h3>我们收集什么？</h3>
        <p>
          键盘小达人是一个 <strong>纯前端网页应用</strong>，没有注册、没有登录、没有账号系统。
          我们不会收集任何孩子的姓名、年龄、照片、语音等个人信息。
        </p>
      </section>

      <section className="privacy-page__section">
        <h3>数据保存在哪里？</h3>
        <p>
          所有学习记录（打卡天数、闯关星级、最高分）只保存在孩子当前使用的这台
          <strong> 电脑的浏览器本地存储（localStorage）</strong> 中，不会上传到任何服务器。
          换句话说：换一台电脑，记录就是全新的；家长也可以随时通过浏览器设置清除。
        </p>
      </section>

      <section className="privacy-page__section">
        <h3>语音是怎么生成的？</h3>
        <p>
          字母读音和夸奖语音是使用微软 Edge TTS（神经网络语音合成）提前生成好的音频文件，
          由我们随应用一起提供，播放时不会向微软或其他第三方发送任何数据。
        </p>
      </section>

      <section className="privacy-page__section">
        <h3>有广告吗？</h3>
        <p>没有广告，也没有任何付费内容。这是一个完全免费、开源的儿童教育工具。</p>
      </section>

      <button
        className="btn btn--primary btn--lg privacy-page__back"
        onClick={(e) => {
          e.currentTarget.blur();
          onBack();
        }}
      >
        ← 返回首页
      </button>
    </div>
  );
}
