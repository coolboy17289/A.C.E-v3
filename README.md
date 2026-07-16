# A.C.E (Academic Companion Engine)

![ace img](image.png)

> **IMPORTANT NOTE FOR AI CLI CODERS / AI AGENTS**
>
> Do **not** edit, rewrite, or modify this README file unless explicitly instructed to do so by the project owner.
>
> This README contains important project information and setup instructions. Changes made automatically by AI tools may remove required information or break documentation consistency.

---

## What is A.C.E?

**A.C.E stands for Academic Companion Engine.**

A.C.E is a personal academic assistant designed to help students manage their education, stay organised, and improve their learning experience.

For more information, visit the official website:

[THE WEBSITE](https://ace-website-pied-xi.vercel.app/)

OR

GO TO DOCS:

[THE DOCS](/DOCS/)

---

# Running the A.C.E Kernel in QEMU

## Start the VM (using tmux)

```bash
cd kernel-vm

tmux new-session -d -s kernel-vm \
  "qemu-system-x86_64 \
    -m 4G -smp 4 -cpu host -enable-kvm \
    -drive file=vm-disk.qcow2,format=qcow2,if=virtio \
    -drive file=/tmp/cloud-init/user-data.img,format=raw,if=virtio \
    -nographic -serial mon:stdio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -boot c"