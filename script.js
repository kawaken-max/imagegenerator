class ImageComposer {
    constructor() {
        this.baseImage = null;
        this.componentImage = null;
        this.canvas = document.getElementById('compositeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.componentPosition = { x: 0, y: 0 };
        this.componentScale = 1;
        this.componentRotation = 0;
        this.componentOpacity = 1;
        this.blendMode = 'normal';
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload handlers
        this.setupFileUpload('baseImageUpload', 'baseImageInput', (file) => this.loadBaseImage(file));
        this.setupFileUpload('componentImageUpload', 'componentImageInput', (file) => this.loadComponentImage(file));

        // Control handlers
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            this.componentOpacity = e.target.value / 100;
            document.getElementById('opacityValue').textContent = e.target.value;
            this.redrawCanvas();
        });

        document.getElementById('scaleSlider').addEventListener('input', (e) => {
            this.componentScale = e.target.value / 100;
            document.getElementById('scaleValue').textContent = e.target.value;
            this.redrawCanvas();
        });

        document.getElementById('rotationSlider').addEventListener('input', (e) => {
            this.componentRotation = parseInt(e.target.value);
            document.getElementById('rotationValue').textContent = e.target.value;
            this.redrawCanvas();
        });

        // Blend mode handlers
        document.querySelectorAll('input[name="blendMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.blendMode = e.target.value;
                this.redrawCanvas();
            });
        });

        // Button handlers
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('generateBtn').addEventListener('click', () => this.generateAIComposite());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());

        // Canvas interaction
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());
    }

    setupFileUpload(areaId, inputId, callback) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);

        area.addEventListener('click', () => input.click());

        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                callback(files[0]);
            }
        });

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                callback(e.target.files[0]);
            }
        });
    }

    loadBaseImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.baseImage = img;
                this.setupCanvas();
                this.showWorkspace();
                this.redrawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadComponentImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.componentImage = img;
                // Center the component image
                this.componentPosition.x = (this.canvas.width - img.width * this.componentScale) / 2;
                this.componentPosition.y = (this.canvas.height - img.height * this.componentScale) / 2;
                this.redrawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupCanvas() {
        if (!this.baseImage) return;

        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = this.baseImage;

        // Scale down if too large
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    showWorkspace() {
        document.getElementById('workspace').style.display = 'grid';
    }

    redrawCanvas() {
        if (!this.baseImage) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw base image
        this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);

        // Draw component image if loaded
        if (this.componentImage) {
            this.ctx.save();
            
            // Set blend mode and opacity
            this.ctx.globalCompositeOperation = this.blendMode;
            this.ctx.globalAlpha = this.componentOpacity;

            // Calculate center point for rotation
            const centerX = this.componentPosition.x + (this.componentImage.width * this.componentScale) / 2;
            const centerY = this.componentPosition.y + (this.componentImage.height * this.componentScale) / 2;

            // Apply transformations
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate((this.componentRotation * Math.PI) / 180);
            this.ctx.scale(this.componentScale, this.componentScale);

            // Draw component image
            this.ctx.drawImage(
                this.componentImage,
                -this.componentImage.width / 2,
                -this.componentImage.height / 2
            );

            this.ctx.restore();
        }
    }

    startDrag(e) {
        if (!this.componentImage) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if click is within component bounds
        const compX = this.componentPosition.x;
        const compY = this.componentPosition.y;
        const compWidth = this.componentImage.width * this.componentScale;
        const compHeight = this.componentImage.height * this.componentScale;

        if (x >= compX && x <= compX + compWidth && y >= compY && y <= compY + compHeight) {
            this.isDragging = true;
            this.dragOffset.x = x - compX;
            this.dragOffset.y = y - compY;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    drag(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.componentPosition.x = x - this.dragOffset.x;
        this.componentPosition.y = y - this.dragOffset.y;

        this.redrawCanvas();
    }

    endDrag() {
        this.isDragging = false;
        this.canvas.style.cursor = 'move';
    }

    reset() {
        this.componentPosition = { x: 0, y: 0 };
        this.componentScale = 1;
        this.componentRotation = 0;
        this.componentOpacity = 1;
        this.blendMode = 'normal';

        // Reset controls
        document.getElementById('opacitySlider').value = 100;
        document.getElementById('opacityValue').textContent = '100';
        document.getElementById('scaleSlider').value = 100;
        document.getElementById('scaleValue').textContent = '100';
        document.getElementById('rotationSlider').value = 0;
        document.getElementById('rotationValue').textContent = '0';
        document.querySelector('input[value="normal"]').checked = true;
        document.getElementById('promptInput').value = '';

        if (this.componentImage) {
            this.componentPosition.x = (this.canvas.width - this.componentImage.width * this.componentScale) / 2;
            this.componentPosition.y = (this.canvas.height - this.componentImage.height * this.componentScale) / 2;
        }

        this.redrawCanvas();
    }

    async generateAIComposite() {
        const prompt = document.getElementById('promptInput').value;
        const generateBtn = document.getElementById('generateBtn');
        
        if (!prompt.trim()) {
            alert('AIプロンプトを入力してください。');
            return;
        }

        // Simulate AI processing
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="loading"></span>AI処理中...';

        try {
            // For demo purposes, we'll just apply some visual effects
            // In a real implementation, this would call an AI service
            await this.simulateAIProcessing();
            
            // Show preview
            this.showPreview();
            
        } catch (error) {
            console.error('AI処理エラー:', error);
            alert('AI処理中にエラーが発生しました。');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = 'AI合成実行';
        }
    }

    async simulateAIProcessing() {
        return new Promise(resolve => {
            setTimeout(() => {
                // Apply some enhanced blending effects
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'soft-light';
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
                
                resolve();
            }, 2000);
        });
    }

    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const previewImage = document.getElementById('previewImage');
        
        previewImage.src = this.canvas.toDataURL('image/png');
        previewSection.style.display = 'block';
        
        // Scroll to preview
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }

    downloadImage() {
        if (!this.baseImage) {
            alert('画像が読み込まれていません。');
            return;
        }

        const link = document.createElement('a');
        link.download = `composite-image-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ImageComposer();
});