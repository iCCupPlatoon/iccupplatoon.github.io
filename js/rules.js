document.querySelectorAll('.rules-list li.popular').forEach(item => {
    let tooltipEl;

    item.addEventListener('mouseenter', () => {
        const text = item.querySelector('.tooltip').textContent;
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'tooltip-floating';
        tooltipEl.textContent = text;
        document.body.appendChild(tooltipEl);

        const rect = item.getBoundingClientRect();
        tooltipEl.style.position = 'fixed';
        tooltipEl.style.top = ${rect.top + rect.height / 2}px;
        tooltipEl.style.left = ${rect.right + 10}px;
        tooltipEl.style.transform = 'translateY(-50%)';
        tooltipEl.style.background = '#555';
        tooltipEl.style.color = '#fff';
        tooltipEl.style.padding = '5px 10px';
        tooltipEl.style.borderRadius = '6px';
        tooltipEl.style.zIndex = 1000;
        tooltipEl.style.fontSize = '13px';
        tooltipEl.style.whiteSpace = 'nowrap';
        tooltipEl.style.boxShadow = '0 0 6px rgba(0,0,0,0.5)';
        tooltipEl.style.pointerEvents = 'none';
    });

    item.addEventListener('mouseleave', () => {
        if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
        }
    });
});